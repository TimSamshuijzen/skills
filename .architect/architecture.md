---
name: architecture
description: Architecture of the solution.
---

# Document description

This document provides an overview and description of the architecture of the 
solution. Diagrams are in ascii or mermaid format.


# Architecture

## Description

Voltage is one HTML file. The file holds the markup, the style and the script. 
The browser is the only thing that the user must have. There is no server, no 
build step and no network access.

The sound comes from the Web Audio API. The synthesizer is a subtractive 
synthesizer: the oscillators make a signal that holds many partials, the filter 
removes a part of them, and the amplifier gives the sound its shape in time. 
This is the signal path of an analog synthesizer: VCO, VCF, VCA.

The script has four layers. Each layer knows only the layer below it.

1. The patch model. One table of parameters. It gives the identifier, the 
   range, the default value and the unit of every control. The engine, the user 
   interface and the presets all read this one table. Thus a new control is one 
   row, and not a change in three places.
2. The engine. It builds and controls the audio graph. It does not touch the 
   document.
3. The user interface. It builds the panel and the keyboard from the patch 
   model, and it calls the engine. It does not build audio nodes.
4. The application. It makes the engine and the user interface, and it holds 
   the presets and the browser storage.

The engine takes an audio context as an argument. It does not make one itself. 
This is the decision that makes the solution testable by a command. The 
application gives the engine a live `AudioContext`. A test gives the engine an 
`OfflineAudioContext`, renders some seconds of sound faster than real time, and 
looks at the sample values. Thus a test of the sound is a test of the same code 
that the user hears, and the result is the same at each run.

The script assigns the layers to `window.Voltage`. This is the only global 
name. The tests use it. It is a small and stable surface: the test does not 
need to know the inside of the engine.


## Overview

```
 +---------------------------------------------------------------+
 |  synth.html                                                    |
 |                                                                |
 |  +---------+   patch   +----------+   note on/off  +--------+  |
 |  |  Panel  |---------->|          |--------------->|        |  |
 |  |  Keys   |           |  Engine  |                | Voices |  |
 |  +---------+<----------|          |<---------------|        |  |
 |       ^      readout   +----------+   voice count  +--------+  |
 |       |                     |                                  |
 |  +---------+               audio graph                         |
 |  | Presets |                                                   |
 |  | Storage |                                                   |
 |  +---------+                                                   |
 +---------------------------------------------------------------+

 Audio graph (one voice, and the master chain):

  osc 1 (sine/tri/saw/pulse) --> level --+
  osc 2 (sine/tri/saw/pulse) --> level --+
  sub  (square, -1 octave)   --> level --+--> mix --> dc block
  noise (white)              --> level --+                |
                                                          v
                            +-----------------------------+
                            |
                            v
                     low pass 12 dB --> low pass 12 dB --> VCA --> voice bus
                            ^                 ^             ^
                     cutoff, key track    resonance     amp ADSR
                            ^
                     filter ADSR (cents) and LFO (cents)

  voice bus --> stereo delay --> reverb --> master volume --> soft clip --> out
```

The two low pass filters in series give 24 dB per octave. That is the slope of 
a ladder filter of an analog synthesizer. One filter alone gives 12 dB per 
octave, and that sounds thin for this kind of instrument.


## Components

| Component | Where | What it does |
| --- | --- | --- |
| Patch model | `PARAMS`, `defaultPatch()` | The table of all parameters, with range, default and unit. |
| Voice | `createVoice()` | Builds the audio nodes of one note. Schedules the two envelopes. Removes itself at the end of the release. |
| Pulse oscillator | `createPulse()` | A pulse wave with a width that the user can change. |
| Noise source | `noiseBuffer()` | One white noise buffer per audio context, used by all voices. |
| Engine | `createEngine(ctx, dest)` | Holds the master chain, the voice list, the note logic, the polyphony and the mono mode. |
| Effects | part of the engine | The stereo delay and the reverb, each with its own mix. |
| Knob | `createKnob()` | One rotary control. Drag, double click, arrow keys, accessible name and role. |
| Switch, select | `createSwitch()`, `createSelect()` | An on/off control and a choice. A select is a `select` of the browser: it already has a role, a name and the arrow keys. |
| Panel | `SECTIONS`, `buildPanel()` | The sections of the panel, built from the patch model. |
| Keyboard | `buildKeyboard()` | The keys, the pointer logic and the octave control. |
| Presets | `FACTORY`, `cleanPatch()`, `readStore()`, `writeStore()` | The factory patches, the browser storage, and the export and import of a patch file. |
| Output stage | `softClipCurve()` | The master volume and the soft clip that holds the output between -1 and 1. |

### The pulse oscillator

The Web Audio API has a sine, a square, a sawtooth and a triangle oscillator. 
It has no pulse oscillator with a width that the user can change. Voltage makes 
one from a sawtooth: the signal goes to the output, and the same signal also 
goes through a delay and an inverter to the output. The sum of the two is a 
rectangular wave. The width of the pulse is the delay time multiplied by the 
frequency. Thus the delay time gives the width, and a modulation of the delay 
time gives pulse width modulation.

A pulse whose width is not 50 percent holds a DC offset. The DC block filter 
after the mix removes it. Without that filter, the offset moves the signal away 
from zero, and a note on or a note off then gives a click.

### Why the cutoff is modulated in cents

The `frequency` parameter of a filter is in hertz, and a modulation in hertz is 
not musical: 1000 hertz at a low cutoff is a large step, and at a high cutoff it 
is a small step. The filter also has a `detune` parameter, in cents. A 
modulation in cents is a multiplication of the frequency. Voltage puts the 
cutoff of the control in `frequency`, and sends the filter envelope and the LFO 
to `detune`. Thus the envelope amount is an interval, and it sounds the same at 
each cutoff.

### Why the voice count is derived from time

A test must give the same result at each run. A voice that removes itself with a 
timer cannot be counted in a test, because an offline render is faster than real 
time and the timer does not agree with it. Therefore each voice records the time 
at which its release ends, and the engine counts the voices whose end time is 
after `ctx.currentTime`. After an offline render, `currentTime` is the length of 
the render. Thus the count is a function of the audio clock, and not of a timer. 
The live application uses the `ended` event of the oscillators to disconnect the 
nodes and to free the memory.


## Data model

A patch is a plain object: a name, and a value for every parameter in `PARAMS`.

```js
{ name: "Init", params: { osc1Wave: "saw", osc1Oct: 0, cutoff: 2000, ... } }
```

`PARAMS` is an array. Each entry holds:

| Field | Meaning |
| --- | --- |
| `id` | The identifier of the parameter. It is the key in `patch.params`. |
| `section` | The section of the panel that holds the control. |
| `label` | The text on the panel. |
| `type` | `knob`, `switch` or `select`. |
| `min`, `max` | The range of a knob. |
| `curve` | `lin` or `exp`. `exp` is for frequencies and times. |
| `step` | The step of a knob that holds whole numbers, such as the octave. |
| `unit` | The unit in the readout, for example `Hz`, `ms`, `ct`. |
| `def` | The default value. |
| `options` | The values of a select, for example the waveforms. |

`SECTIONS` gives the sections of the panel, in the order of the signal path, 
each with a title and a `cols`: how many controls stand next to each other. The 
`cols` keeps the rows of the panel together, with oscillator 1 on one row and 
oscillator 2 under it.

The storage holds the user patches under one key, `voltage.patches.v1`, as 
JSON. An export file holds one patch in the same format. An import reads only 
the parameters that are in `PARAMS`, and uses the default for a parameter that 
the file does not hold. Thus an old file still loads after a new parameter is 
added.


## Interfaces

The script assigns one global object. The application and the tests use it.

```js
window.Voltage = {
  PARAMS,                  // the patch model
  defaultPatch(),          // a patch with all default values
  FACTORY,                 // the factory patches
  createEngine(ctx, dest), // the engine, on a live or an offline context
  ui                       // the panel, only in the page
}
```

The engine gives these functions:

| Function | What it does |
| --- | --- |
| `noteOn(midi, velocity, time)` | Starts a note. `time` is a time of the audio context. |
| `noteOff(midi, time)` | Starts the release of a note. |
| `allNotesOff(time)` | Starts the release of every note. |
| `setParam(id, value, time)` | Changes one parameter. It acts on the voices that sound, over a short ramp. |
| `setPatch(patch, time)` | Changes every parameter. |
| `getPatch()` | Gives the current patch. |
| `voiceCount()` | The number of voices that sound now. |
| `master` | The voice bus: the input node of the master chain. |

`time` is always a time of the audio context, and it may be left out. Without 
it, the change happens at once, or at `currentTime` for a change that ramps. A 
test that renders offline must give it: there the clock of the context stands 
at zero while the test sets everything up, and thus the test says when each 
thing must happen.

`window.Voltage.ui` is the page: the panel, the keyboard and the patches.

| Member | What it does |
| --- | --- |
| `powerOn()` | Makes the audio context. The first pointer action calls it. |
| `audioState()` | `off` before the first action, then the state of the context. |
| `engine()`, `context()` | The engine and the audio context, or null before the power on. |
| `getPatch()` | The patch that the panel shows now. |
| `setParam(id, value)` | Changes one parameter, and the control that shows it. |
| `applyPatch(patch)` | Changes every parameter, and every control. |
| `controls`, `keyboard` | The controls by parameter id, and the keyboard. |

A test of the panel uses the document where it can: it drags a knob, it clicks 
a key, and it reads the value from the control. In this way the test tests what 
the user does. It uses `ui` only to read the result and to set up a state.
