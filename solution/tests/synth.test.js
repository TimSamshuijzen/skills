'use strict';

// The test suite of Voltage.
//
// One test case per requirement ID and per implementation task ID. The name of
// a test case starts with its ID and a space. Do not add a test case without an
// ID, and do not use a form that the runner expands into more than one reported
// test case: the number of reported test cases must stay equal to the number in
// .architect/test-method.md.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const h = require('./lib/harness');

after(async () => {
  await h.closeBrowser();
});

test('T1 - test harness opens the solution in a browser', async () => {
  const s = await h.openPage();
  try {
    assert.ok(s.url.startsWith('file:'), 'the page is opened from a file URL');

    const hasVoltage = await s.page.evaluate(
      () => typeof window.Voltage === 'object' && window.Voltage !== null
    );
    assert.ok(hasVoltage, 'window.Voltage exists in the page');

    const hasAnalysis = await s.page.evaluate(
      () => !!(window.__VA && typeof window.__VA.analyze === 'function')
    );
    assert.ok(hasAnalysis, 'the analysis bundle is installed in the page');

    const offlineWorks = await s.page.evaluate(async () => {
      const ctx = new OfflineAudioContext(2, 1024, 44100);
      const buf = await ctx.startRendering();
      return buf.length;
    });
    assert.equal(offlineWorks, 1024, 'the browser renders an OfflineAudioContext');
  } finally {
    await s.close();
  }
});

test('R1 - standalone single file', async () => {
  const s = await h.openPage();
  try {
    // Before the first click the page waits, and it makes no sound.
    assert.ok(
      await s.page.locator('#start-plate').isVisible(),
      'the start plate is visible before the first click'
    );
    assert.equal(
      await s.page.evaluate(() => window.Voltage.ui.audioState()),
      'off',
      'no audio context exists before the first click'
    );

    await h.startAudio(s.page);

    await s.page.waitForSelector('#start-plate', { state: 'hidden', timeout: 3000 });
    assert.equal(
      await s.page.evaluate(() => window.Voltage.ui.audioState()),
      'running',
      'the audio context runs after the click'
    );

    // The page asks nothing of any server.
    const external = s.requests.filter((u) => u !== s.url);
    assert.deepEqual(external, [], 'the page makes no request beside the page itself');

    assert.deepEqual(s.consoleErrors, [], 'the console holds no error');

    // The file refers to no other file.
    const src = fs.readFileSync(h.SYNTH_FILE, 'utf8');
    const refs = [...src.matchAll(/\b(?:src|href)\s*=\s*"([^"]*)"/g)].map((m) => m[1]);
    const outside = refs.filter((u) => !u.startsWith('data:') && !u.startsWith('#'));
    assert.deepEqual(outside, [], 'the html refers to no file outside itself');
  } finally {
    await s.close();
  }
});

// One voice, alone. Every source is silent, so that a test switches on only
// what it measures, and both effects are off.
//
// The effects are on in the default patch, because the synthesizer must sound
// good when it is opened. A test that measures the voice itself switches them
// off: a delay repeat or a reverb tail is sound that the voice did not make
// now, and the measurement would read it as if the voice made it.
const BARE = {
  osc1Level: 0,
  osc2Level: 0,
  subLevel: 0,
  noiseLevel: 0,
  delayOn: false,
  revOn: false,
};

// Holds the amplifier at a steady level. A test that looks at how the sound
// changes over time needs this: without it, the decay of the amplifier
// envelope moves the level, and the test measures the envelope instead of the
// thing that it wants to measure.
const STEADY = { ampAttack: 0.005, ampDecay: 9, ampSustain: 1 };
const A3 = 57; // MIDI note A3, 220 Hz
const F_A3 = h.hz(A3);

/** How many times per second a series goes up through its own mean. */
function cycles(values, times) {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  let n = 0;
  for (let i = 1; i < values.length; i++) {
    if (values[i - 1] <= mean && values[i] > mean) n++;
  }
  return n / (times[times.length - 1] - times[0]);
}

/**
 * Collects the checks of one test case and reports all the failures together.
 *
 * A plain assert stops at the first failure, and then one run shows one
 * problem. These checks all run, and the failure message names every check
 * that failed. It stays one reported test case.
 */
function checks() {
  const list = [];
  const c = {
    ok(cond, msg) {
      list.push({ ok: !!cond, msg });
      return c;
    },
    done() {
      const bad = list.filter((x) => !x.ok).map((x) => x.msg);
      assert.deepEqual(bad, [], `${bad.length} of ${list.length} checks failed`);
    },
  };
  return c;
}

test('R2 - oscillator section', async () => {
  const s = await h.openPage();
  const note = [{ midi: A3, on: 0 }];
  try {
    // --- every waveform sounds, and its spectrum agrees with the waveform ---
    const byWave = {};
    for (const wave of ['sine', 'tri', 'saw', 'pulse']) {
      byWave[wave] = await h.analyze(s.page, {
        params: { ...BARE, osc1Level: 1, osc1Wave: wave, osc1Width: 0.5 },
        notes: note,
        seconds: 0.6,
        f0: F_A3,
        partialCount: 10,
      });
      assert.ok(byWave[wave].rms > 0.01, `${wave} gives sound (rms ${byWave[wave].rms})`);
    }

    const sine = byWave.sine.partials;
    assert.ok(
      sine[1] / sine[0] < 0.05,
      `a sine holds one strong partial (second/first = ${(sine[1] / sine[0]).toFixed(4)})`
    );

    const saw = byWave.saw.partials;
    assert.ok(saw[1] / saw[0] > 0.25, `a sawtooth holds a second partial (${(saw[1] / saw[0]).toFixed(3)})`);
    assert.ok(saw[5] / saw[0] > 0.05, `a sawtooth holds a sixth partial (${(saw[5] / saw[0]).toFixed(3)})`);

    const upper = (p) => p.slice(5).reduce((a, b) => a + b * b, 0) / (p[0] * p[0]);
    assert.ok(
      upper(byWave.tri.partials) < upper(saw),
      `a triangle holds less high energy than a sawtooth (${upper(byWave.tri.partials).toExponential(2)} < ${upper(saw).toExponential(2)})`
    );

    // --- detune: zero is steady, ten cents beats ---------------------------
    const twoSines = {
      ...BARE,
      ...STEADY,
      osc1Level: 1,
      osc2Level: 1,
      osc1Wave: 'sine',
      osc2Wave: 'sine',
    };
    const spread = (r) => {
      const v = r.frames.filter((f) => f.t > 0.15).map((f) => f.rms);
      return (Math.max(...v) - Math.min(...v)) / Math.max(...v);
    };
    const flat = await h.analyze(s.page, {
      params: { ...twoSines, osc2Detune: 0 },
      notes: note,
      seconds: 1.6,
      frames: { size: 2048, hop: 1024 },
    });
    const beat = await h.analyze(s.page, {
      params: { ...twoSines, osc2Detune: 10 },
      notes: note,
      seconds: 1.6,
      frames: { size: 2048, hop: 1024 },
    });
    assert.ok(spread(flat) < 0.05, `a detune of zero does not move the level (${spread(flat).toFixed(4)})`);
    assert.ok(spread(beat) > 0.5, `a detune of 10 cents beats (${spread(beat).toFixed(3)})`);

    // --- octave doubles the frequency --------------------------------------
    const oct = async (n) =>
      (
        await h.analyze(s.page, {
          params: { ...BARE, osc1Level: 1, osc1Wave: 'sine', osc1Oct: n },
          notes: note,
          seconds: 0.6,
          dom: [40, 2000],
        })
      ).dom;
    const d0 = await oct(0);
    const d1 = await oct(1);
    assert.ok(Math.abs(d0 - F_A3) < 3, `octave 0 gives ${d0.toFixed(1)} Hz, near ${F_A3.toFixed(1)}`);
    assert.ok(Math.abs(d1 / d0 - 2) < 0.02, `octave 1 doubles the frequency (${(d1 / d0).toFixed(3)})`);

    // --- pulse width changes the even partials ------------------------------
    const pulse = async (w) =>
      (
        await h.analyze(s.page, {
          params: { ...BARE, osc1Level: 1, osc1Wave: 'pulse', osc1Width: w },
          notes: note,
          seconds: 0.6,
          f0: F_A3,
          partialCount: 4,
        })
      ).partials;
    const sq = await pulse(0.5);
    const na = await pulse(0.25);
    const dbSq = 20 * Math.log10(sq[1] / sq[0]);
    const dbNa = 20 * Math.log10(na[1] / na[0]);
    assert.ok(dbSq < -20, `a width of 50 percent removes the second partial (${dbSq.toFixed(1)} dB)`);
    assert.ok(dbNa > -12, `a width of 25 percent keeps the second partial (${dbNa.toFixed(1)} dB)`);

    // --- a level of zero removes the source ---------------------------------
    const subOnly = await h.analyze(s.page, {
      params: { ...BARE, subLevel: 1 },
      notes: note,
      seconds: 0.6,
      dom: [40, 2000],
    });
    assert.ok(
      Math.abs(subOnly.dom - F_A3 / 2) < 3,
      `the sub sounds one octave under the note (${subOnly.dom.toFixed(1)} Hz)`
    );
    const noiseOnly = await h.analyze(s.page, {
      params: { ...BARE, noiseLevel: 1 },
      notes: note,
      seconds: 0.6,
    });
    assert.ok(noiseOnly.rms > 0.01, `the noise source sounds (rms ${noiseOnly.rms.toFixed(4)})`);

    const nothing = await h.analyze(s.page, { params: BARE, notes: note, seconds: 0.6 });
    assert.ok(nothing.rms < 1e-6, `every level at zero gives silence (rms ${nothing.rms.toExponential(2)})`);
  } finally {
    await s.close();
  }
});

test('R3 - filter section', async () => {
  const s = await h.openPage();
  const c = checks();
  // A sawtooth on A2 holds many partials, and thus it shows what the filter
  // takes away.
  const sawNote = [{ midi: 45, on: 0 }];
  const saw = { ...BARE, osc1Level: 1, osc1Wave: 'saw', keyTrack: 0, reso: 0.7, filterEnv: 0 };
  try {
    // --- the cutoff takes away the high frequencies ------------------------
    const hiBand = { bands: [[2000, 8000]] };
    const low = await h.analyze(s.page, { params: { ...saw, cutoff: 300 }, notes: sawNote, seconds: 0.6, ...hiBand });
    const high = await h.analyze(s.page, { params: { ...saw, cutoff: 8000 }, notes: sawNote, seconds: 0.6, ...hiBand });
    c.ok(
      low.bands[0] < high.bands[0] * 0.05,
      `a cutoff of 300 Hz gives far less energy above 2 kHz than a cutoff of 8 kHz ` +
        `(${low.bands[0].toExponential(2)} against ${high.bands[0].toExponential(2)})`
    );

    // --- the resonance lifts the band at the cutoff -------------------------
    const atCut = { bands: [[900, 1150]] };
    const flatQ = await h.analyze(s.page, { params: { ...saw, cutoff: 1000, reso: 0.7 }, notes: sawNote, seconds: 0.6, ...atCut });
    const highQ = await h.analyze(s.page, { params: { ...saw, cutoff: 1000, reso: 14 }, notes: sawNote, seconds: 0.6, ...atCut });
    c.ok(
      highQ.bands[0] > flatQ.bands[0] * 2,
      `a resonance of 14 lifts the band at the cutoff over a resonance of 0.7 ` +
        `(${highQ.bands[0].toExponential(2)} against ${flatQ.bands[0].toExponential(2)})`
    );

    // --- the keyboard tracking moves the cutoff with the note ---------------
    // The noise source has the same spectrum at every note. Thus a change in
    // the corner frequency comes from the tracking, and not from the note.
    const noise = { ...BARE, noiseLevel: 1, cutoff: 1000, reso: 0.7, filterEnv: 0 };
    const corner = async (midi, keyTrack) =>
      (
        await h.analyze(s.page, {
          params: { ...noise, keyTrack },
          notes: [{ midi, on: 0 }],
          seconds: 0.6,
          rolloff: 0.5,
        })
      ).rolloff;

    const track0C4 = await corner(60, 0);
    const track0C5 = await corner(72, 0);
    const track1C4 = await corner(60, 1);
    const track1C5 = await corner(72, 1);

    c.ok(
      Math.abs(track0C5 / track0C4 - 1) < 0.05,
      `with tracking at 0 the corner does not move with the note ` +
        `(${track0C4.toFixed(0)} Hz against ${track0C5.toFixed(0)} Hz)`
    );
    c.ok(
      Math.abs(track1C5 / track1C4 - 2) < 0.15,
      `with tracking at 1 an octave higher gives a corner an octave higher ` +
        `(${track1C4.toFixed(0)} Hz against ${track1C5.toFixed(0)} Hz)`
    );

    // --- the filter envelope moves the cutoff over time ---------------------
    // The amplifier holds a steady level here, and thus a change in the high
    // band comes from the filter alone.
    const sweep = async (amount, cutoff) =>
      await h.analyze(s.page, {
        params: {
          ...saw,
          cutoff,
          filterEnv: amount,
          filtAttack: 0.005,
          filtDecay: 0.35,
          filtSustain: 0,
          ampAttack: 0.005,
          ampDecay: 9,
          ampSustain: 1,
        },
        notes: sawNote,
        seconds: 1.2,
        frames: { size: 4096, hop: 4096, bands: [[1500, 6000]] },
      });

    const opens = await sweep(3600, 250);
    const oEarly = opens.frames[0].bands[0];
    const oLate = opens.frames[opens.frames.length - 1].bands[0];
    c.ok(
      oEarly > oLate * 5,
      `a positive envelope amount opens the filter at the attack and closes it after ` +
        `(${oEarly.toExponential(2)} at the start against ${oLate.toExponential(2)} at the end)`
    );

    const closes = await sweep(-3600, 3000);
    const cEarly = closes.frames[0].bands[0];
    const cLate = closes.frames[closes.frames.length - 1].bands[0];
    c.ok(
      cLate > cEarly * 5,
      `a negative envelope amount closes the filter at the attack ` +
        `(${cEarly.toExponential(2)} at the start against ${cLate.toExponential(2)} at the end)`
    );

    c.done();
  } finally {
    await s.close();
  }
});

test('R4 - envelopes', async () => {
  const s = await h.openPage();
  const c = checks();
  // A sine through a wide open filter: what the frames show is the envelope
  // and nothing else.
  const base = {
    ...BARE,
    osc1Level: 1,
    osc1Wave: 'sine',
    cutoff: 18000,
    reso: 0.7,
    filterEnv: 0,
    keyTrack: 0,
  };
  const note = [{ midi: A3, on: 0 }];
  const frames = { size: 512, hop: 256 };
  const at = (fs, t) => fs.reduce((a, b) => (Math.abs(b.t - t) < Math.abs(a.t - t) ? b : a)).peak;
  const top = (fs) => Math.max(...fs.map((f) => f.peak));

  try {
    // --- the peak of the level is at the end of the attack ------------------
    const attackRun = async (attack) => {
      const r = await h.analyze(s.page, {
        params: { ...base, ampAttack: attack, ampDecay: 0.08, ampSustain: 0 },
        notes: note,
        seconds: 1.2,
        frames,
      });
      let best = 0;
      let t = 0;
      for (const f of r.frames) {
        if (f.peak > best) {
          best = f.peak;
          t = f.t;
        }
      }
      return t;
    };
    const t200 = await attackRun(0.2);
    const t400 = await attackRun(0.4);
    c.ok(
      Math.abs(t200 - 0.2) < 0.04,
      `an attack of 200 ms gives the peak near 200 ms (${(t200 * 1000).toFixed(0)} ms)`
    );
    c.ok(
      t400 > t200 + 0.15,
      `a longer attack gives a later peak (${(t400 * 1000).toFixed(0)} ms after ${(t200 * 1000).toFixed(0)} ms)`
    );

    // --- decay to the sustain level -----------------------------------------
    const ds = await h.analyze(s.page, {
      params: { ...base, ampAttack: 0.005, ampDecay: 0.1, ampSustain: 0.5 },
      notes: note,
      seconds: 1.0,
      frames,
    });
    const dsTop = top(ds.frames);
    const dsAt300 = at(ds.frames, 0.3);
    c.ok(
      Math.abs(dsAt300 / dsTop - 0.5) < 0.08,
      `a decay of 100 ms to a sustain of 0.5 gives about half of the peak at 300 ms ` +
        `(${(dsAt300 / dsTop).toFixed(3)})`
    );

    // --- a sustain of zero gives silence after the decay --------------------
    const s0 = await h.analyze(s.page, {
      params: { ...base, ampAttack: 0.005, ampDecay: 0.1, ampSustain: 0 },
      notes: note,
      seconds: 1.0,
      frames,
    });
    c.ok(
      at(s0.frames, 0.5) < top(s0.frames) * 0.02,
      `a sustain of 0 gives silence after the decay (${(at(s0.frames, 0.5) / top(s0.frames)).toExponential(2)} of the peak)`
    );

    // --- the release falls to silence ---------------------------------------
    const rel = await h.analyze(s.page, {
      params: { ...base, ampAttack: 0.005, ampDecay: 0.05, ampSustain: 0.8, ampRelease: 0.2 },
      notes: [{ midi: A3, on: 0, off: 0.5 }],
      seconds: 1.2,
      frames,
    });
    const relTop = top(rel.frames);
    c.ok(
      at(rel.frames, 0.45) > relTop * 0.5,
      `the note still sounds before the note off (${(at(rel.frames, 0.45) / relTop).toFixed(3)} of the peak)`
    );
    c.ok(
      at(rel.frames, 0.6) < relTop * 0.5,
      `the release has started at 100 ms after the note off (${(at(rel.frames, 0.6) / relTop).toFixed(3)} of the peak)`
    );
    c.ok(
      at(rel.frames, 0.85) < relTop * 0.01,
      `the level is silent after the release time (${(at(rel.frames, 0.85) / relTop).toExponential(2)} of the peak)`
    );

    c.done();
  } finally {
    await s.close();
  }
});

test('R5 - LFO modulation', async () => {
  const s = await h.openPage();
  const c = checks();
  // A steady amplifier, so that every change over time comes from the LFO.
  const base = {
    ...BARE,
    osc1Level: 1,
    cutoff: 18000,
    reso: 0.7,
    filterEnv: 0,
    keyTrack: 0,
    ...STEADY,
    lfoWave: 'tri',
  };
  const note = [{ midi: A3, on: 0 }];
  const after = (r) => r.frames.filter((f) => f.t > 0.1);

  try {
    // --- to the pitch --------------------------------------------------------
    const pitch = await h.analyze(s.page, {
      params: { ...base, osc1Wave: 'sine', lfoDest: 'pitch', lfoDepth: 0.5, lfoRate: 5 },
      notes: note,
      seconds: 1.4,
      frames: { size: 2048, hop: 512, dom: [120, 420] },
    });
    const pf = after(pitch);
    const doms = pf.map((f) => f.dom);
    const pitchSwing = Math.max(...doms) - Math.min(...doms);
    const pitchRate = cycles(doms, pf.map((f) => f.t));
    c.ok(pitchSwing > 12, `the pitch moves over time (${pitchSwing.toFixed(1)} Hz between the lowest and the highest)`);
    c.ok(
      Math.abs(pitchRate - 5) < 1.5,
      `the pitch moves up and down about 5 times per second (${pitchRate.toFixed(2)})`
    );

    // --- to the filter -------------------------------------------------------
    const filt = await h.analyze(s.page, {
      params: { ...base, osc1Wave: 'saw', cutoff: 700, lfoDest: 'filter', lfoDepth: 0.5, lfoRate: 5 },
      notes: note,
      seconds: 1.4,
      frames: { size: 2048, hop: 512, bands: [[1500, 6000]] },
    });
    const ff = after(filt);
    const fb = ff.map((f) => f.bands[0]);
    const filtRate = cycles(fb, ff.map((f) => f.t));
    c.ok(
      Math.max(...fb) > Math.min(...fb) * 3,
      `the high frequency energy moves over time (${Math.max(...fb).toExponential(2)} against ${Math.min(...fb).toExponential(2)})`
    );
    c.ok(
      Math.abs(filtRate - 5) < 1.5,
      `the filter moves up and down about 5 times per second (${filtRate.toFixed(2)})`
    );

    // --- to the pulse width ---------------------------------------------------
    // The level of the second partial of a pulse of width d follows
    // |sin(2*pi*d)|. That has a top at d = 0.25 and a zero at d = 0.5. A sweep
    // around 0.36 stays on the falling part, and thus the level follows the
    // width one to one. A sweep around 0.25 would pass the top two times per
    // cycle, and then the level moves at two times the rate of the LFO.
    const band2 = [[F_A3 * 2 - 25, F_A3 * 2 + 25]];
    const width = await h.analyze(s.page, {
      params: {
        ...base,
        osc1Wave: 'pulse',
        osc1Width: 0.36,
        lfoDest: 'width',
        lfoDepth: 0.2,
        lfoRate: 4,
      },
      notes: note,
      seconds: 1.4,
      frames: { size: 2048, hop: 512, bands: band2 },
    });
    const wf = after(width);
    const wb = wf.map((f) => f.bands[0]);
    const widthRate = cycles(wb, wf.map((f) => f.t));
    c.ok(
      Math.max(...wb) > Math.min(...wb) * 2,
      `the level of the second partial moves over time (${Math.max(...wb).toExponential(2)} against ${Math.min(...wb).toExponential(2)})`
    );
    c.ok(
      Math.abs(widthRate - 4) < 1.2,
      `the width moves up and down about 4 times per second (${widthRate.toFixed(2)})`
    );

    // --- a depth of zero adds nothing ------------------------------------------
    const none = await h.diff(s.page, {
      paramsA: { ...base, osc1Wave: 'saw', cutoff: 1500, lfoDest: 'pitch', lfoDepth: 0, lfoRate: 5 },
      paramsB: { ...base, osc1Wave: 'saw', cutoff: 1500, lfoDest: 'filter', lfoDepth: 0, lfoRate: 0.05 },
      notes: note,
      seconds: 0.8,
    });
    c.ok(none.rmsA > 0.01, `the render is not silent (rms ${none.rmsA.toFixed(4)})`);
    c.ok(
      none.maxDiff === 0,
      `a depth of zero gives the same samples, whatever the rate and the destination (largest difference ${none.maxDiff})`
    );

    c.done();
  } finally {
    await s.close();
  }
});

test('R6 - polyphony and mono mode', async () => {
  const s = await h.openPage();
  const c = checks();
  // Sine voices, so that each note gives one clear partial to look for.
  const base = {
    ...BARE,
    osc1Level: 1,
    osc1Wave: 'sine',
    cutoff: 18000,
    reso: 0.7,
    filterEnv: 0,
    keyTrack: 0,
    ...STEADY,
    ampRelease: 0.1,
  };
  const eight = [48, 52, 55, 60, 64, 67, 72, 76];
  const ninth = 79;

  try {
    // --- eight notes at the same time all sound -----------------------------
    const chord = await h.analyze(s.page, {
      params: base,
      notes: eight.map((midi) => ({ midi, on: 0 })),
      seconds: 0.8,
      window: [0.3, 0.7],
      probes: eight.map(h.hz),
    });
    const weakest = Math.min(...chord.probes);
    const strongest = Math.max(...chord.probes);
    c.ok(chord.voiceCount === 8, `eight notes give eight voices (${chord.voiceCount})`);
    c.ok(
      weakest > strongest * 0.5,
      `every one of the eight notes sounds (weakest ${weakest.toExponential(2)}, strongest ${strongest.toExponential(2)})`
    );

    // --- a ninth note takes the oldest voice --------------------------------
    const stolen = await h.analyze(s.page, {
      params: base,
      notes: eight
        .map((midi, i) => ({ midi, on: i * 0.01 }))
        .concat([{ midi: ninth, on: 0.4 }]),
      seconds: 1.0,
      window: [0.6, 0.95],
      probes: [h.hz(eight[0]), h.hz(ninth), h.hz(eight[7])],
    });
    c.ok(stolen.voiceCount === 8, `a ninth note keeps eight voices (${stolen.voiceCount})`);
    c.ok(
      stolen.probes[1] > stolen.probes[0] * 20,
      `the ninth note sounds and the oldest note is gone ` +
        `(oldest ${stolen.probes[0].toExponential(2)}, ninth ${stolen.probes[1].toExponential(2)})`
    );
    c.ok(
      stolen.probes[2] > stolen.probes[0] * 20,
      `the notes that are not the oldest still sound (${stolen.probes[2].toExponential(2)})`
    );

    // --- every voice is gone after the release ------------------------------
    const gone = await h.analyze(s.page, {
      params: base,
      notes: eight.map((midi) => ({ midi, on: 0, off: 0.3 })),
      seconds: 1.2,
    });
    c.ok(gone.voiceCount === 0, `no voice is left after the release (${gone.voiceCount})`);

    // --- mono mode holds one voice ------------------------------------------
    const monoHeld = await h.analyze(s.page, {
      params: { ...base, mode: 'mono', glide: 0 },
      notes: [
        { midi: 60, on: 0 },
        { midi: 64, on: 0.3 },
      ],
      seconds: 0.8,
      window: [0.5, 0.75],
      probes: [h.hz(60), h.hz(64)],
    });
    c.ok(monoHeld.voiceCount === 1, `two held notes in mono mode give one voice (${monoHeld.voiceCount})`);
    c.ok(
      monoHeld.probes[1] > monoHeld.probes[0] * 20,
      `the newest held note sounds in mono mode ` +
        `(first ${monoHeld.probes[0].toExponential(2)}, newest ${monoHeld.probes[1].toExponential(2)})`
    );

    // --- the glide moves the pitch over the glide time ----------------------
    const glideRun = async (glide) =>
      await h.analyze(s.page, {
        params: { ...base, mode: 'mono', glide },
        notes: [
          { midi: 60, on: 0 },
          { midi: 72, on: 0.5 },
        ],
        seconds: 1.0,
        frames: { size: 2048, hop: 512, dom: [180, 700] },
      });
    const at = (fs, t) => fs.reduce((a, b) => (Math.abs(b.t - t) < Math.abs(a.t - t) ? b : a)).dom;

    const glided = await glideRun(0.2);
    const mid = at(glided.frames, 0.59);
    c.ok(
      mid > h.hz(60) * 1.1 && mid < h.hz(72) * 0.92,
      `with a glide of 200 ms the pitch at 100 ms after the note is between the two notes ` +
        `(${mid.toFixed(0)} Hz, between ${h.hz(60).toFixed(0)} and ${h.hz(72).toFixed(0)})`
    );

    const jumped = await glideRun(0);
    const straight = at(jumped.frames, 0.59);
    c.ok(
      Math.abs(straight - h.hz(72)) < 15,
      `with a glide of 0 the pitch is at the new note (${straight.toFixed(0)} Hz against ${h.hz(72).toFixed(0)})`
    );

    c.done();
  } finally {
    await s.close();
  }
});

test('R8 - delay and reverb', async () => {
  const s = await h.openPage();
  const c = checks();
  // A short click of a note. What comes after it comes from the effects.
  const pluck = {
    ...BARE,
    osc1Level: 1,
    osc1Wave: 'saw',
    cutoff: 6000,
    reso: 0.7,
    filterEnv: 0,
    keyTrack: 0,
    ampAttack: 0.003,
    ampDecay: 0.03,
    ampSustain: 0,
    ampRelease: 0.01,
    delayOn: false,
    revOn: false,
  };
  const note = [{ midi: A3, on: 0, off: 0.05 }];
  const frames = { size: 1024, hop: 256 };
  const at = (fs, t) => fs.reduce((a, b) => (Math.abs(b.t - t) < Math.abs(a.t - t) ? b : a)).peak;

  try {
    // --- the delay repeats the sound -----------------------------------------
    const echo = await h.analyze(s.page, {
      params: { ...pluck, delayOn: true, delayTime: 0.25, delayFb: 0.5, delayMix: 0.6 },
      notes: note,
      seconds: 1.4,
      frames,
    });
    const gap = at(echo.frames, 0.16);
    const rep1 = at(echo.frames, 0.26);
    c.ok(
      rep1 > gap * 5,
      `a delay of 250 ms gives a repeat near 250 ms (${rep1.toFixed(4)} against ${gap.toFixed(4)} between the repeats)`
    );
    c.ok(echo.chanDiff > 0.01, `the left and the right channel of the delay are not the same (${echo.chanDiff.toFixed(4)})`);

    // --- more feedback gives more repeats ------------------------------------
    const fb = async (amount) =>
      await h.analyze(s.page, {
        params: { ...pluck, delayOn: true, delayTime: 0.25, delayFb: amount, delayMix: 0.6 },
        notes: note,
        seconds: 1.6,
        frames,
      });
    const fbLow = await fb(0.2);
    const fbHigh = await fb(0.7);
    const countRepeats = (r) => {
      const top = Math.max(...r.frames.map((f) => f.peak));
      return [0.26, 0.51, 0.76, 1.01, 1.26].filter((t) => at(r.frames, t) > top * 0.02).length;
    };
    const nLow = countRepeats(fbLow);
    const nHigh = countRepeats(fbHigh);
    c.ok(
      nHigh > nLow,
      `a feedback of 0.7 gives more repeats than a feedback of 0.2 (${nHigh} against ${nLow})`
    );

    // --- the reverb continues after the note ---------------------------------
    const dryTail = await h.analyze(s.page, { params: pluck, notes: note, seconds: 1.0, frames });
    const wetTail = await h.analyze(s.page, {
      params: { ...pluck, revOn: true, revSize: 2, revMix: 0.6 },
      notes: note,
      seconds: 1.0,
      frames,
    });
    c.ok(
      at(wetTail.frames, 0.35) > at(dryTail.frames, 0.35) * 20,
      `the reverb still sounds 300 ms after the note (${at(wetTail.frames, 0.35).toExponential(2)} against ` +
        `${at(dryTail.frames, 0.35).toExponential(2)} with the reverb off)`
    );

    // --- an effect that is off adds nothing ----------------------------------
    c.ok(
      at(dryTail.frames, 0.4) < 1e-6,
      `with both effects off the output is silent after the note (${at(dryTail.frames, 0.4).toExponential(2)})`
    );

    const offIgnores = await h.diff(s.page, {
      paramsA: { ...pluck, delayTime: 0.25, delayFb: 0.2, delayMix: 0, revSize: 1, revMix: 0 },
      paramsB: { ...pluck, delayTime: 0.8, delayFb: 0.9, delayMix: 1, revSize: 3.5, revMix: 1 },
      notes: note,
      seconds: 0.8,
    });
    c.ok(offIgnores.rmsA > 0.001, `the render is not silent (rms ${offIgnores.rmsA.toFixed(5)})`);
    c.ok(
      offIgnores.maxDiff === 0,
      `an effect that is off gives the same samples whatever its controls say (largest difference ${offIgnores.maxDiff})`
    );

    c.done();
  } finally {
    await s.close();
  }
});

test('R7 - on screen keyboard', async () => {
  const s = await h.openPage();
  const c = checks();
  const page = s.page;
  const voices = () => page.evaluate(() => window.Voltage.ui.engine().voiceCount());
  const lit = () => page.$$eval('.key.on', (els) => els.map((e) => Number(e.dataset.midi)));
  const silence = () =>
    page.waitForFunction(() => window.Voltage.ui.engine().voiceCount() === 0, null, { timeout: 4000 });

  // The low part of a white key: the black keys lie over the upper part.
  const spot = async (midi) => {
    const b = await page.locator(`.key[data-midi="${midi}"]`).boundingBox();
    return { x: b.x + b.width / 2, y: b.y + b.height - 10 };
  };

  try {
    await h.startAudio(page);
    // A short release, so that the test does not wait for a long tail.
    await page.evaluate(() => window.Voltage.ui.setParam('ampRelease', 0.05));

    // --- a press starts the note, a release stops it -------------------------
    const c4 = await spot(60);
    await page.mouse.move(c4.x, c4.y);
    await page.mouse.down();
    c.ok((await voices()) === 1, `a press on a key starts one voice (${await voices()})`);
    c.ok(
      JSON.stringify(await lit()) === '[60]',
      `the key that sounds has the class, and no other key has it (${JSON.stringify(await lit())})`
    );

    await page.mouse.up();
    await silence();
    c.ok((await lit()).length === 0, 'a release takes the class off the key');

    // --- a drag over the keys moves the note ---------------------------------
    await page.mouse.move(c4.x, c4.y);
    await page.mouse.down();
    const e4 = await spot(64);
    await page.mouse.move(e4.x, e4.y, { steps: 8 });
    const dragging = await lit();
    // The keys that the drag passed over are released, and they fade out over
    // their release time. That is why this counts the notes that are held, and
    // not the voices that still sound.
    c.ok(
      JSON.stringify(dragging) === '[64]',
      `a drag to E4 holds only the new note: the old note was stopped (${JSON.stringify(dragging)})`
    );
    await page.mouse.up();
    await silence();
    c.ok((await voices()) === 0, 'after the drag every voice has ended');

    // --- a pointer that leaves the keyboard leaves no note on ----------------
    await page.mouse.move(c4.x, c4.y);
    await page.mouse.down();
    await page.mouse.move(20, 20, { steps: 8 });
    await page.mouse.up();
    c.ok((await lit()).length === 0, 'a pointer that leaves the keyboard leaves no key on');
    await silence();
    c.ok((await voices()) === 0, 'a pointer that leaves the keyboard leaves no voice sounding');

    // --- the octave control moves the range ----------------------------------
    const first = () => page.$$eval('.key', (els) => Number(els[0].dataset.midi));
    const before = await first();
    await page.locator('button[aria-label="Octave up"]').click();
    const after = await first();
    c.ok(after === before + 12, `the octave up control moves the keys by 12 (${before} to ${after})`);

    await page.locator('button[aria-label="Octave down"]').click();
    c.ok((await first()) === before, `the octave down control moves them back (${await first()})`);

    // The keys of the new range play the notes of the new range.
    await page.locator('button[aria-label="Octave up"]').click();
    const moved = await spot(before + 12);
    await page.mouse.move(moved.x, moved.y);
    await page.mouse.down();
    c.ok(
      JSON.stringify(await lit()) === JSON.stringify([before + 12]),
      `after the octave change the first key plays its new note (${JSON.stringify(await lit())})`
    );
    await page.mouse.up();
    await silence();

    c.done();
  } finally {
    await s.close();
  }
});

test('R9 - presets', async () => {
  const s = await h.openPage();
  const c = checks();
  const page = s.page;
  const params = () => page.evaluate(() => window.Voltage.ui.getPatch().params);
  const names = (group) =>
    page.$$eval(`#preset-list optgroup[label="${group}"] option`, (els) =>
      els.map((e) => e.textContent)
    );

  // Clicking Export makes a blob and downloads it. This catches the blob in
  // the page, and thus the test reads exactly the file that the user gets.
  const catchExport = async (target) => {
    await target.evaluate(() => {
      window.__exported = null;
      const orig = URL.createObjectURL.bind(URL);
      URL.createObjectURL = function (b) {
        b.text().then((t) => { window.__exported = t; });
        return orig(b);
      };
    });
    await target.click('#preset-export');
    await target.waitForFunction(() => window.__exported !== null, null, { timeout: 4000 });
    return target.evaluate(() => window.__exported);
  };

  let work = null;
  try {
    // The start plate covers the page until the first click.
    await h.startAudio(page);

    // --- the factory patches --------------------------------------------------
    const factory = await names('Factory');
    c.ok(
      factory.length >= 6,
      `the list holds at least six factory patches (${factory.length}: ${factory.join(', ')})`
    );

    await page.selectOption('#preset-list', 'f:Warm Pad');
    const loadedFactory = await params();
    const wantFactory = await page.evaluate(() => {
      const V = window.Voltage;
      const f = V.FACTORY.filter((x) => x.name === 'Warm Pad')[0];
      return Object.assign({}, V.defaultPatch().params, f.params);
    });
    const wrong = Object.keys(wantFactory).filter((k) => wantFactory[k] !== loadedFactory[k]);
    c.ok(wrong.length === 0, `a factory patch sets every control (wrong: ${wrong.join(', ')})`);

    const shownCutoff = await page.getAttribute('[data-param="cutoff"]', 'aria-valuenow');
    c.ok(
      Number(shownCutoff) === wantFactory.cutoff,
      `the panel shows the value of the loaded patch (${shownCutoff} against ${wantFactory.cutoff})`
    );

    // --- save, reload, load ----------------------------------------------------
    await page.fill('#preset-name', 'My Test Patch');
    await page.evaluate(() => window.Voltage.ui.setParam('cutoff', 777));
    await page.click('#preset-save');
    const saved = await params();

    await page.reload();
    await h.startAudio(page);
    const mine = await names('Yours');
    c.ok(
      mine.includes('My Test Patch'),
      `a saved patch is in the list after a reload of the page (${mine.join(', ') || 'none'})`
    );

    await page.selectOption('#preset-list', 'u:My Test Patch');
    const reloaded = await params();
    const changed = Object.keys(saved).filter((k) => saved[k] !== reloaded[k]);
    c.ok(changed.length === 0, `a saved patch loads with the same values (different: ${changed.join(', ')})`);

    // --- remove ----------------------------------------------------------------
    await page.click('#preset-delete');
    await page.reload();
    await h.startAudio(page);
    const left = await names('Yours');
    c.ok(
      !left.includes('My Test Patch'),
      `a removed patch is gone after a reload of the page (${left.join(', ') || 'none'})`
    );

    // --- export and import ------------------------------------------------------
    await page.selectOption('#preset-list', 'f:Pluck');
    const text = await catchExport(page);
    const exported = JSON.parse(text);
    const allIds = await page.evaluate(() => window.Voltage.PARAMS.map((p) => p.id));
    const absent = allIds.filter((id) => !(id in exported.params));
    c.ok(absent.length === 0, `the export holds every parameter (missing: ${absent.join(', ')})`);

    work = fs.mkdtempSync(path.join(os.tmpdir(), 'voltage-'));
    const file = path.join(work, 'patch.voltage.json');
    fs.writeFileSync(file, text);

    await page.selectOption('#preset-list', 'f:Init');
    await page.setInputFiles('#preset-file', file);
    await page.waitForFunction(
      () => /Loaded/.test(document.getElementById('preset-msg').textContent),
      null,
      { timeout: 4000 }
    );
    const imported = await params();
    const offByImport = allIds.filter((id) => exported.params[id] !== imported[id]);
    c.ok(
      offByImport.length === 0,
      `an import of that file gives the same values (different: ${offByImport.join(', ')})`
    );

    // --- a browser that blocks the storage ---------------------------------------
    const blocked = await h.openPage({
      initScript: () => {
        Object.defineProperty(window, 'localStorage', {
          configurable: true,
          get() {
            throw new Error('storage is blocked');
          },
        });
      },
    });
    try {
      await h.startAudio(blocked.page);
      const msg = await blocked.page.textContent('#preset-msg');
      c.ok(/storage/i.test(msg), `the panel says that the storage is not available ("${msg}")`);

      const stillWorks = JSON.parse(await catchExport(blocked.page));
      c.ok(
        allIds.every((id) => id in stillWorks.params),
        'the export still works without the browser storage'
      );
      c.ok(
        blocked.consoleErrors.length === 0,
        `the page writes no error without the browser storage (${blocked.consoleErrors.join(' | ')})`
      );
    } finally {
      await blocked.close();
    }

    c.done();
  } finally {
    if (work) fs.rmSync(work, { recursive: true, force: true });
    await s.close();
  }
});

test('R10 - hardware style panel', async () => {
  const s = await h.openPage();
  const c = checks();
  const page = s.page;
  const paramOf = (id) => page.evaluate((k) => window.Voltage.ui.getPatch().params[k], id);
  const knobOf = (id) => page.locator(`[data-param="${id}"]`);

  try {
    // The start plate covers the panel until the synthesizer is on.
    await h.startAudio(page);

    // --- a section per part of the signal path -------------------------------
    const titles = await page.$$eval('#panel-grid .sec > legend', (els) =>
      els.map((e) => e.textContent.trim())
    );
    for (const want of ['Oscillators', 'Filter', 'Amp Envelope', 'Filter Envelope', 'LFO', 'Effects', 'Master']) {
      c.ok(titles.includes(want), `the panel holds a section "${want}" (found ${titles.join(', ')})`);
    }

    // --- every parameter has a control with a name and a role ----------------
    const info = await page.evaluate(() =>
      window.Voltage.PARAMS.map((p) => {
        const e = document.querySelector('[data-param="' + p.id + '"]');
        if (!e) return { id: p.id, missing: true };
        return {
          id: p.id,
          role: e.getAttribute('role') || e.tagName.toLowerCase(),
          name: e.getAttribute('aria-label') || '',
        };
      })
    );
    const missing = info.filter((x) => x.missing).map((x) => x.id);
    const nameless = info.filter((x) => !x.missing && !x.name).map((x) => x.id);
    const badRole = info.filter((x) => !x.missing && !['slider', 'switch', 'select'].includes(x.role));
    c.ok(missing.length === 0, `every parameter has a control (missing: ${missing.join(', ')})`);
    c.ok(nameless.length === 0, `every control has an accessible name (without: ${nameless.join(', ')})`);
    c.ok(badRole.length === 0, `every control has a role that fits (wrong: ${badRole.map((x) => x.id + '=' + x.role).join(', ')})`);

    // --- a drag up gives more, a drag down gives less ------------------------
    const drag = async (id, dy, endOutside) => {
      const box = await knobOf(id).boundingBox();
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;
      await page.mouse.move(cx, cy);
      await page.mouse.down();
      await page.mouse.move(cx, cy - dy, { steps: 6 });
      if (endOutside) await page.mouse.move(cx + 420, cy - dy, { steps: 4 });
      await page.mouse.up();
      return paramOf(id);
    };

    const start = await paramOf('cutoff');
    const up = await drag('cutoff', 100, false);
    c.ok(up > start, `a drag up gives a higher value (${start.toFixed(0)} to ${up.toFixed(0)} Hz)`);
    const down = await drag('cutoff', -100, false);
    c.ok(down < up, `a drag down gives a lower value (${up.toFixed(0)} to ${down.toFixed(0)} Hz)`);

    // The knob keeps the pointer until the button goes up, and thus a drag
    // that leaves the knob still turns it.
    const beforeOut = await paramOf('cutoff');
    const afterOut = await drag('cutoff', 80, true);
    c.ok(
      afterOut > beforeOut,
      `a drag that ends outside the knob still changes the value (${beforeOut.toFixed(0)} to ${afterOut.toFixed(0)} Hz)`
    );

    // --- the readout and the indicator both show the value -------------------
    const shown = await page.evaluate(() => {
      const cell = document.querySelector('[data-param="cutoff"]').closest('.ctrl');
      return {
        text: cell.querySelector('.ctrl-value').textContent,
        turn: document.querySelector('[data-param="cutoff"] .knob-ind').style.transform,
      };
    });
    c.ok(/Hz/.test(shown.text), `the knob shows its value with its unit (${shown.text})`);
    c.ok(/rotate\(/.test(shown.turn), `the indicator of the knob turns (${shown.turn})`);

    // --- a double click gives back the default -------------------------------
    await knobOf('cutoff').dblclick();
    const def = await page.evaluate(() => window.Voltage.PARAMS.find((p) => p.id === 'cutoff').def);
    const reset = await paramOf('cutoff');
    c.ok(reset === def, `a double click gives back the default value (${reset} against ${def})`);

    // --- the arrow keys change the control that has the focus ----------------
    await knobOf('cutoff').focus();
    await page.keyboard.press('ArrowUp');
    const byKey = await paramOf('cutoff');
    c.ok(byKey > reset, `the arrow key up gives a higher value (${reset.toFixed(0)} to ${byKey.toFixed(0)} Hz)`);

    await knobOf('delayOn').focus();
    await page.keyboard.press('ArrowDown');
    c.ok((await paramOf('delayOn')) === false, 'the arrow key down switches a switch off');

    // --- the change reaches the engine ---------------------------------------
    const inEngine = await page.evaluate(() => window.Voltage.ui.engine().getPatch().params.cutoff);
    c.ok(
      Math.abs(inEngine - byKey) < 1e-6,
      `the value of the panel reached the engine (${inEngine.toFixed(0)} against ${byKey.toFixed(0)})`
    );

    // --- the panel fits in the window ----------------------------------------
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    c.ok(width <= 1280, `the panel fits in 1280 pixels without a sideways scroll (${width})`);

    c.done();
  } finally {
    await s.close();
  }
});

test('R11 - output stage and stability', async () => {
  const s = await h.openPage();
  const c = checks();
  const note = [{ midi: A3, on: 0.05, off: 0.5 }];
  const loud = {
    osc1Level: 1,
    osc2Level: 1,
    subLevel: 1,
    noiseLevel: 1,
    masterVol: 1,
    cutoff: 18000,
    reso: 0.7,
  };

  try {
    // --- a volume of zero gives silence --------------------------------------
    const off = await h.analyze(s.page, {
      params: { ...loud, masterVol: 0 },
      notes: note,
      seconds: 1.0,
    });
    c.ok(off.peak === 0, `a master volume of zero gives samples that are all zero (peak ${off.peak})`);

    // --- the volume changes the level ----------------------------------------
    const half = await h.analyze(s.page, { params: { ...loud, masterVol: 0.3 }, notes: note, seconds: 1.0 });
    const full = await h.analyze(s.page, { params: { ...loud, masterVol: 1 }, notes: note, seconds: 1.0 });
    c.ok(
      full.rms > half.rms * 1.5,
      `a higher master volume gives a higher level (${full.rms.toFixed(4)} against ${half.rms.toFixed(4)})`
    );

    // --- a note on and a note off give no click ------------------------------
    // A pulse and a sawtooth step a lot between two samples by themselves.
    // Thus the windows at the note on and at the note off are compared with a
    // window in the middle of the same note.
    const edges = await h.analyze(s.page, {
      params: {
        ...BARE,
        osc1Level: 0.9,
        osc1Wave: 'pulse',
        osc1Width: 0.2,
        masterVol: 0.9,
        cutoff: 12000,
        ...STEADY,
        ampRelease: 0.15,
      },
      notes: note,
      seconds: 1.4,
      steps: [
        [0.02, 0.09],
        [0.2, 0.4],
        [0.47, 0.54],
      ],
    });
    const [onStep, midStep, offStep] = edges.steps;
    c.ok(
      onStep <= midStep * 1.2,
      `a note on gives no step over the steps of the waveform (${onStep.toFixed(4)} against ${midStep.toFixed(4)} in the middle)`
    );
    c.ok(
      offStep <= midStep * 1.2,
      `a note off gives no step over the steps of the waveform (${offStep.toFixed(4)} against ${midStep.toFixed(4)} in the middle)`
    );

    // --- a knob that turns while the note sounds gives no click --------------
    const turned = await h.analyze(s.page, {
      params: {
        ...BARE,
        osc1Level: 0,
        osc1Wave: 'saw',
        masterVol: 0.9,
        cutoff: 12000,
        reso: 0.7,
        filterEnv: 0,
        delayOn: false,
        revOn: false,
        ...STEADY,
      },
      notes: [{ midi: A3, on: 0.05 }],
      seconds: 1.0,
      changes: [{ t: 0.4, id: 'osc1Level', value: 1 }],
      steps: [
        [0.38, 0.45],
        [0.6, 0.9],
      ],
    });
    c.ok(
      turned.steps[0] <= turned.steps[1] * 1.2,
      `a level that is turned up while the note sounds gives no click ` +
        `(${turned.steps[0].toFixed(4)} at the change against ${turned.steps[1].toFixed(4)} after it)`
    );
    c.ok(turned.peak > 0.05, `the turned up level is audible (peak ${turned.peak.toFixed(4)})`);

    // --- eight notes at full level do not go over 1.0 ------------------------
    const eight = await h.analyze(s.page, {
      params: loud,
      notes: [48, 52, 55, 60, 64, 67, 72, 76].map((midi) => ({ midi, on: 0 })),
      seconds: 1.0,
    });
    c.ok(
      eight.peak <= 1.0,
      `eight notes at the maximum level give a peak that is not over 1.0 (${eight.peak.toFixed(4)})`
    );
    c.ok(eight.peak > 0.5, `eight notes at the maximum level do use the output (peak ${eight.peak.toFixed(4)})`);

    // --- every voice ends ----------------------------------------------------
    const ended = await h.analyze(s.page, {
      params: { ...loud, ampRelease: 0.2, revOn: false, delayOn: false },
      notes: [48, 52, 55, 60, 64, 67, 72, 76].map((midi) => ({ midi, on: 0, off: 0.3 })),
      seconds: 1.4,
      frames: { size: 1024, hop: 512 },
    });
    const tail = ended.frames[ended.frames.length - 1];
    c.ok(tail.peak < 0.001, `the level falls to silence after the release (${tail.peak.toExponential(2)})`);
    c.ok(ended.voiceCount === 0, `no voice is left after the release (${ended.voiceCount})`);

    c.done();
  } finally {
    await s.close();
  }
});
