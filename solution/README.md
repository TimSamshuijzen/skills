# Voltage

Voltage is an analog style polyphonic synthesizer in one HTML file. You open
the file in a browser and you play it. There is no server, no install and no
network access.

## Run it

You need a modern browser. Chrome, Edge and Firefox are good. Nothing else.

Open `synth.html` in the browser. Double click the file, or drag it onto the
browser window, or run the command of your system from this directory:

```
start synth.html
```

That is the Windows command. On macOS it is `open synth.html`, and on Linux it
is `xdg-open synth.html`.

The browser does not let a page make sound before you act. Therefore the page
shows a start plate. Click it one time, and the synthesizer is ready.

## Play it

Click or touch the keys at the bottom. Drag over them to slide from note to
note. The two buttons on the left of the keyboard move the range by an octave.

Turn a knob with a drag up or down. Hold shift while you drag for a fine move.
A double click on a knob gives it back its default. The arrow keys change the
control that has the focus, and thus the whole panel also works from the
keyboard.

The signal path is the one of an analog synthesizer, from left to right:
two oscillators with a sub and a noise source, a resonant low pass filter with
its own envelope, an amplifier envelope, one LFO, and then a stereo delay, a
reverb and the master volume.

## Patches

The Patch row above the panel holds the factory patches. Type a name and press
Save to keep the sound you made; it stays in the browser storage of this page.
Delete removes a patch of your own.

Export writes the patch to a JSON file, and Import reads one back. Use these to
move a patch to another computer or browser, or to keep it in a place that you
choose. If your browser blocks the storage for a page that comes from a file,
the panel says so, and Export and Import still work.

## Test it

The tests need more than the solution itself:

- Node.js version 22 or higher.
- Google Chrome, installed on the machine. The tests drive this Chrome without
  a window. They do not download a browser.

Install the test dependency one time:

```
npm install
```

Run the full test suite:

```
npm test
```

Run one single test case by its ID, for example R3:

```
node --test --test-name-pattern "^R3 " "tests/*.test.js"
```

## What is in this directory

| Path | What it is |
| --- | --- |
| `synth.html` | The solution. This one file is the whole synthesizer. |
| `tests/synth.test.js` | The test suite. One test case per requirement. |
| `tests/lib/harness.js` | Starts Chrome, opens the page, and measures the sound. |
| `package.json` | The test script and the test dependency. |
