'use strict';

// Test harness for Voltage.
//
// It starts one headless Chrome for the whole run, opens solution/synth.html
// from a file:// URL, and gives a fresh page per test case.
//
// It also installs an analysis bundle in every page. The bundle renders the
// synthesizer through an OfflineAudioContext and measures the result. Thus a
// test looks at the sample values of the same engine that the user hears, and
// the result is the same at each run.
//
// This file is in tests/lib/ and not in tests/, because the Node test runner
// reads every file directly in the tests/ directory as a test file.

const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright-core');

const SYNTH_FILE = path.join(__dirname, '..', '..', 'synth.html');
const SYNTH_URL = pathToFileURL(SYNTH_FILE).href;

let browserPromise = null;

function getBrowser() {
  if (!browserPromise) {
    // channel: "chrome" uses the Chrome that is installed on the machine.
    // Thus the install needs no browser download.
    browserPromise = chromium.launch({
      channel: 'chrome',
      args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'],
    });
  }
  return browserPromise;
}

async function closeBrowser() {
  if (browserPromise) {
    const b = await browserPromise;
    browserPromise = null;
    await b.close();
  }
}

// The analysis bundle. This function is serialized and runs in the page,
// before the page scripts, at every navigation. It only defines things.
function analysisBundle() {
  const A = {};

  // ---- signal analysis -------------------------------------------------

  // In place radix 2 FFT.
  A.fft = function (re, im) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) {
        let t = re[i]; re[i] = re[j]; re[j] = t;
        t = im[i]; im[i] = im[j]; im[j] = t;
      }
    }
    for (let len = 2; len <= n; len <<= 1) {
      const ang = (-2 * Math.PI) / len;
      const wr = Math.cos(ang);
      const wi = Math.sin(ang);
      for (let i = 0; i < n; i += len) {
        let cr = 1;
        let ci = 0;
        for (let k = 0; k < len / 2; k++) {
          const ur = re[i + k];
          const ui = im[i + k];
          const xr = re[i + k + len / 2];
          const xi = im[i + k + len / 2];
          const vr = xr * cr - xi * ci;
          const vi = xr * ci + xi * cr;
          re[i + k] = ur + vr;
          im[i + k] = ui + vi;
          re[i + k + len / 2] = ur - vr;
          im[i + k + len / 2] = ui - vi;
          const ncr = cr * wr - ci * wi;
          ci = cr * wi + ci * wr;
          cr = ncr;
        }
      }
    }
  };

  // Magnitude spectrum of a Hann windowed block. Gives n/2 bins.
  A.spectrum = function (x, start, n) {
    const re = new Float64Array(n);
    const im = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const s = start + i < x.length ? x[start + i] : 0;
      re[i] = s * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1)));
    }
    A.fft(re, im);
    const mag = new Float64Array(n / 2);
    for (let i = 0; i < n / 2; i++) {
      mag[i] = Math.sqrt(re[i] * re[i] + im[i] * im[i]) / (n / 4);
    }
    return mag;
  };

  // Magnitude at one exact frequency, with the Goertzel algorithm. This is
  // more precise than a bin of the FFT, because a partial is seldom exactly
  // on a bin.
  A.goertzel = function (x, start, len, freq, sr) {
    const k = 2 * Math.cos((2 * Math.PI * freq) / sr);
    let s1 = 0;
    let s2 = 0;
    for (let i = 0; i < len; i++) {
      const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (len - 1));
      const s0 = w * (x[start + i] || 0) + k * s1 - s2;
      s2 = s1;
      s1 = s0;
    }
    const p = s1 * s1 + s2 * s2 - k * s1 * s2;
    return Math.sqrt(Math.max(0, p)) / (len / 4);
  };

  // Strongest frequency in a block, with parabolic interpolation around the
  // peak bin. The interpolation gives a far better resolution than the bin
  // width, and thus a short block can still measure a pitch.
  A.dominant = function (x, start, n, sr, minHz, maxHz) {
    const mag = A.spectrum(x, start, n);
    const lo = Math.max(1, Math.floor((minHz * n) / sr));
    const hi = Math.min(mag.length - 2, Math.ceil((maxHz * n) / sr));
    let bi = 0;
    let best = -1;
    for (let i = lo; i <= hi; i++) {
      if (mag[i] > best) {
        best = mag[i];
        bi = i;
      }
    }
    if (bi <= 0) return 0;
    const a = mag[bi - 1];
    const b = mag[bi];
    const c = mag[bi + 1];
    const den = a - 2 * b + c;
    const d = Math.abs(den) < 1e-20 ? 0 : (0.5 * (a - c)) / den;
    return ((bi + d) * sr) / n;
  };

  A.rms = function (x, start, len) {
    let s = 0;
    const end = Math.min(x.length, start + len);
    for (let i = start; i < end; i++) s += x[i] * x[i];
    const n = Math.max(1, end - start);
    return Math.sqrt(s / n);
  };

  A.bandEnergy = function (mag, sr, n, lo, hi) {
    const a = Math.max(0, Math.floor((lo * n) / sr));
    const b = Math.min(mag.length - 1, Math.ceil((hi * n) / sr));
    let s = 0;
    for (let i = a; i <= b; i++) s += mag[i] * mag[i];
    return s;
  };

  // ---- rendering -------------------------------------------------------

  // Renders the engine through an OfflineAudioContext and gives the buffer.
  A.renderBuffer = async function (o) {
    const sr = o.sampleRate || 44100;
    const channels = o.channels || 2;
    const frames = Math.max(128, Math.round((o.seconds || 1) * sr));
    const ctx = new OfflineAudioContext(channels, frames, sr);
    const V = window.Voltage;
    const engine = V.createEngine(ctx, ctx.destination);
    const patch = V.defaultPatch();
    Object.assign(patch.params, o.params || {});
    engine.setPatch(patch);
    const notes = o.notes || [];
    for (const nt of notes) {
      engine.noteOn(nt.midi, nt.vel == null ? 1 : nt.vel, nt.on || 0);
    }
    for (const nt of notes) {
      if (nt.off != null) engine.noteOff(nt.midi, nt.off);
    }
    // A control that the user turns while the note sounds.
    for (const ch of o.changes || []) {
      engine.setParam(ch.id, ch.value, ch.t);
    }
    const buf = await ctx.startRendering();
    return { buf, engine, ctx };
  };

  // Renders and measures. See the harness for the shape of o and of the
  // result.
  A.analyze = async function (o) {
    const r = await A.renderBuffer(o);
    const buf = r.buf;
    const sr = buf.sampleRate;
    const L = buf.getChannelData(0);
    const R = buf.numberOfChannels > 1 ? buf.getChannelData(1) : L;

    let peak = 0;
    let maxStep = 0;
    let sum = 0;
    for (let i = 0; i < L.length; i++) {
      const v = Math.abs(L[i]);
      if (v > peak) peak = v;
      sum += L[i] * L[i];
      if (i > 0) {
        const d = Math.abs(L[i] - L[i - 1]);
        if (d > maxStep) maxStep = d;
      }
    }
    const out = {
      rms: Math.sqrt(sum / Math.max(1, L.length)),
      peak: peak,
      maxStep: maxStep,
      voiceCount: r.engine.voiceCount(),
      chanRms: [A.rms(L, 0, L.length), A.rms(R, 0, R.length)],
      partials: [],
      bands: [],
      frames: [],
    };

    let chanDiff = 0;
    if (buf.numberOfChannels > 1) {
      for (let i = 0; i < L.length; i++) {
        const d = Math.abs(L[i] - R[i]);
        if (d > chanDiff) chanDiff = d;
      }
    }
    out.chanDiff = chanDiff;

    // Window for the spectrum measurements.
    const w = o.window || [0.15, 0.45];
    const wStart = Math.max(0, Math.round(w[0] * sr));
    const wLen = Math.min(L.length - wStart, Math.round((w[1] - w[0]) * sr));

    if (o.dom) {
      out.dom = A.dominant(L, wStart, 8192, sr, o.dom[0], o.dom[1]);
    }

    // The largest step between two samples inside each of a list of windows.
    // A click is a step that is much larger than the steps that the waveform
    // itself makes. Thus a test compares a window around a note on with a
    // window in the middle of the note, and it does not need an absolute
    // number that depends on the waveform.
    if (o.steps) {
      out.steps = o.steps.map((w) => {
        const a = Math.max(1, Math.round(w[0] * sr));
        const b = Math.min(L.length - 1, Math.round(w[1] * sr));
        let m = 0;
        for (let i = a; i <= b; i++) {
          const d = Math.abs(L[i] - L[i - 1]);
          if (d > m) m = d;
        }
        return m;
      });
    }

    // The frequency under which the given share of the energy lies. A low pass
    // filter moves this frequency with its cutoff, and thus it measures where
    // the corner of the filter is, without a sweep.
    if (o.rolloff) {
      const n = 8192;
      const mag = A.spectrum(L, wStart, n);
      let total = 0;
      for (let i = 0; i < mag.length; i++) total += mag[i] * mag[i];
      let acc = 0;
      let idx = mag.length - 1;
      for (let i = 0; i < mag.length; i++) {
        acc += mag[i] * mag[i];
        if (acc >= total * o.rolloff) {
          idx = i;
          break;
        }
      }
      out.rolloff = (idx * sr) / n;
    }

    if (o.f0) {
      const count = o.partialCount || 12;
      for (let k = 1; k <= count; k++) {
        out.partials.push(A.goertzel(L, wStart, wLen, o.f0 * k, sr));
      }
    }

    // The level at each of a list of exact frequencies. A chord test asks for
    // the first partial of every note that it played.
    if (o.probes && o.probes.length) {
      out.probes = o.probes.map((f) => A.goertzel(L, wStart, wLen, f, sr));
    }

    if (o.bands && o.bands.length) {
      const n = 8192;
      const mag = A.spectrum(L, wStart, n);
      for (const b of o.bands) out.bands.push(A.bandEnergy(mag, sr, n, b[0], b[1]));
    }

    if (o.frames) {
      const size = o.frames.size || 2048;
      const hop = o.frames.hop || 512;
      const dom = o.frames.dom || null;
      const fBands = o.frames.bands || null;
      for (let s = 0; s + size <= L.length; s += hop) {
        let fp = 0;
        for (let i = s; i < s + size; i++) {
          const v = Math.abs(L[i]);
          if (v > fp) fp = v;
        }
        const fr = { t: s / sr, rms: A.rms(L, s, size), peak: fp };
        if (dom) fr.dom = A.dominant(L, s, size, sr, dom[0], dom[1]);
        if (fBands) {
          const mag = A.spectrum(L, s, size);
          fr.bands = fBands.map((b) => A.bandEnergy(mag, sr, size, b[0], b[1]));
        }
        out.frames.push(fr);
      }
    }

    return out;
  };

  // Renders two parameter sets and compares them sample by sample.
  A.diff = async function (o) {
    const a = await A.renderBuffer({ ...o, params: o.paramsA });
    const b = await A.renderBuffer({ ...o, params: o.paramsB });
    const la = a.buf.getChannelData(0);
    const lb = b.buf.getChannelData(0);
    let maxDiff = 0;
    for (let i = 0; i < la.length; i++) {
      const d = Math.abs(la[i] - lb[i]);
      if (d > maxDiff) maxDiff = d;
    }
    return {
      maxDiff: maxDiff,
      rmsA: A.rms(la, 0, la.length),
      rmsB: A.rms(lb, 0, lb.length),
    };
  };

  window.__VA = A;
}

/**
 * Opens a fresh page on solution/synth.html.
 *
 * opts.initScript - a function that runs in the page before the page scripts.
 *
 * Gives { page, context, consoleErrors, requests, close() }.
 */
async function openPage(opts = {}) {
  const browser = await getBrowser();
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await context.addInitScript(analysisBundle);
  if (opts.initScript) await context.addInitScript(opts.initScript);

  const consoleErrors = [];
  const requests = [];
  const page = await context.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  page.on('pageerror', (e) => consoleErrors.push(String(e)));
  page.on('request', (r) => requests.push(r.url()));

  await page.goto(SYNTH_URL);
  await page.waitForFunction(() => !!window.Voltage);

  return {
    page,
    context,
    consoleErrors,
    requests,
    url: SYNTH_URL,
    close: () => context.close(),
  };
}

/** Clicks the start plate, so that the live audio context runs. */
async function startAudio(page) {
  await page.click('#start-plate');
  await page.waitForFunction(() => window.Voltage.ui && window.Voltage.ui.audioState() === 'running', null, {
    timeout: 5000,
  });
}

/** Renders the engine offline and measures the result. */
function analyze(page, opts) {
  return page.evaluate((o) => window.__VA.analyze(o), opts);
}

/** Renders two parameter sets and compares the samples. */
function diff(page, opts) {
  return page.evaluate((o) => window.__VA.diff(o), opts);
}

/** The frequency of a MIDI note number. */
function hz(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

module.exports = { openPage, startAudio, analyze, diff, closeBrowser, hz, SYNTH_URL, SYNTH_FILE };
