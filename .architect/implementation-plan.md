---
name: implementation-plan
description: Implementation plan for implementing the solution.
---

# Document description

This document defines the implementation plan for implementing the solution. It 
is a sequential list of implementation tasks. The implementation task 
description contains instructions for guiding the developer to what is expected 
of the implementation task, such as selecting tools or design decisions.


# Implementation plan

Each implementation task has a row in the implementation tasks table, and a 
detail section below the table with the same ID. The row holds the state. The 
detail section holds the text. Each row has one detail section, and each detail 
section has one row.

The rows are sorted by logical and testable stages. The tasks are done in the 
order of the rows. IDs are given in order of creation. Thus the IDs are not 
necessarily in order in the table.

T12 stands before T9 in this table. The panel is built from the table of 
parameters, and thus the whole engine, with its master volume, must exist 
before the panel is built. Otherwise the master section of the panel holds no 
control, and the panel must be built a second time.

When making changes to the table, make sure the table format remains intact. 
Each row of the table is a single text line.

The implementation tasks table has these columns:
- ID - Unique identifier of the task. ID is a number with prefix "T". A new 
  task gets the ID on the `Next ID` line above the table, and then `Next ID` is 
  increased by one. An ID is never reused, also not after the task is removed.
- Name - Short and appropriate name of the implementation task.
- Requirements - The IDs of the requirements in `requirements.md` that this 
  task implements. Separate multiple IDs with a comma, for example "R1, R3". 
  This column makes it possible to find the tasks for a requirement that 
  failed, or for a requirement that changed. A task that implements no 
  requirement on its own, such as a task that sets up the project structure, 
  has an empty Requirements column.
- Changed - `yes` when the task was done in the current cycle and the result is 
  not verified yet. Empty when not. Requirements verification uses this column 
  to find which manual tests it must do again. Verification empties this column 
  when it records the results.
- State - State of the implementation task:
  - `planned` - The task is planned, but it is not done or not tested yet.
  - `pass` - The last test passed the acceptance criteria.
  - `fail` - The task was done, but the last test did not pass the acceptance 
    criteria.
  - `deferred` - The user agreed that this task is not done now. Only the user 
    can decide this.

Each requirement that is not `deferred` must have at least one implementation 
task that implements it.

An implementation task detail section has this format:

```
### T1 - Name of the task

**Description:** Description of the sub-tasks for this implementation task.

**Acceptance criteria:**
- Criteria that the implementation task must satisfy when testing.

**Test result:** What was observed in the last test: the command that was run, 
and the result that it gave. Write "Not tested yet" when there is no result.
```

## Implementation tasks table

Next ID: T13

| ID | Name | Requirements | Changed | State |
| --- | --- | --- | --- | --- |
| T1 | Test harness and skeleton |  |  | pass |
| T2 | Page shell and audio start | R1 |  | pass |
| T3 | Patch model and oscillators | R2 |  | pass |
| T4 | Filter section | R3 |  | pass |
| T5 | Envelopes | R3, R4 |  | pass |
| T6 | LFO modulation | R5 |  | pass |
| T7 | Voice manager | R6 |  | pass |
| T8 | Delay and reverb | R8 |  | pass |
| T12 | Output stage and stability | R11 |  | pass |
| T9 | Panel and knobs | R10 |  | pass |
| T10 | On screen keyboard | R7 |  | pass |
| T11 | Presets and storage | R9 |  | pass |

## Implementation task details

### T1 - Test harness and skeleton

**Description:** Make the solution directory and the test harness. The harness 
opens the solution file in a real browser and runs code in the page. Without 
this, no requirement of this solution can be tested by a command.

- Make `solution/synth.html` with a minimal page that assigns `window.Voltage`.
- Make `solution/package.json`. It holds the `test` script and the development 
  dependency `playwright-core`. The solution itself has no dependency: the 
  dependency is only for the tests.
- Use `playwright-core` with the Chrome that is installed on the machine 
  (`channel: "chrome"`). Do not download a browser. The download is about 130 
  megabyte and it is not necessary here.
- Make `solution/tests/lib/harness.js`. It starts the browser one time for the 
  whole run, opens `synth.html` from a `file://` URL, gives a fresh page per 
  test case, and closes the browser at the end of the run. It also holds the 
  analysis bundle: the harness installs this bundle in the page with 
  `addInitScript`, and the bundle renders a patch and a list of notes through an 
  `OfflineAudioContext` and gives back the numbers that a test needs (level, 
  peak, largest step between two samples, the level per partial and per 
  frequency band, and the level and the pitch per frame). The synthesizer itself 
  does not hold test code.
- Make `solution/tests/synth.test.js` with one test case, `T1`.
- Find the command that runs the suite, and check what it counts. Node 22 does 
  not take a directory: `node --test tests/` tries to load `tests` as a module 
  and fails. The command is `node --test "tests/*.test.js"`. Node expands the 
  pattern itself. The summary line `# tests` counts the test cases, and not the 
  test files: two files with three and two test cases give `# tests 5`. The 
  pattern does not match `tests/lib/`, and thus the runner does not read the 
  harness as a test file.
- Write `solution/README.md` with the commands to run and to test the solution.

**Acceptance criteria:**
- `npm install` in `solution/` ends without an error and downloads no browser.
- `npm test` reports exactly one test case, and that test case passes.
- The test case `T1` opens the page from a `file://` URL and finds 
  `window.Voltage`.
- A second run of the command gives the same result.

**Test result:** `npm install` gave "added 1 package in 3s", and no browser was 
downloaded. `npm test` (which runs `node --test "tests/*.test.js"`) gave 
`ok 1 - T1 - test harness opens the solution in a browser`, with 
`# tests 1 / # pass 1 / # fail 0`. A second run gave the same lines. The test 
case opened the page from a `file://` URL, found `window.Voltage` and the 
analysis bundle, and rendered 1024 samples through an `OfflineAudioContext`.

### T2 - Page shell and audio start

**Description:** Make the standalone page. All style and all script are inside 
`synth.html`. Use one classic `<script>` with an IIFE that assigns 
`window.Voltage`. Do not use a module import, because a module import from a 
`file://` URL is blocked by the browser.

- A dark page with the name of the solution and a place for the panel and the 
  keyboard.
- The page does not make an `AudioContext` at load. A browser does not let a 
  page make sound before the user acts. The page shows a start plate over the 
  panel with the text that tells the user to click. The first pointer action 
  makes the audio context, resumes it, and removes the plate.
- No request to the network: no font from a server, no script from a server, no 
  image from a server. A font is a font of the system. An image is CSS or SVG in 
  the file.
- Write the test case `R1`: open the page from a `file://` URL, count the 
  requests that are not the page itself, read the console, click to start, and 
  check that the audio context runs.

**Acceptance criteria:**
- The solution is one file. `solution/synth.html` runs without another file.
- The page shows the start plate before the first click, and not after it.
- The number of network requests, apart from the page itself, is zero.
- No message of the level `error` is in the console after the load and after the 
  first click.
- `AudioContext.state` is `running` after the click.

**Test result:** `npm test` gave `ok 2 - R1 - standalone single file`, with 
`# tests 2 / # pass 2 / # fail 0`. The test case saw the start plate before the 
click, `audioState()` of `off` before the click and `running` after it, the 
plate hidden after the click, zero requests beside the page itself, an empty 
console, and no `src` or `href` in the file that points outside the file.

### T3 - Patch model and oscillators

**Description:** Make the patch model and the source part of the voice.

- `PARAMS`: the table of every parameter, as in the architecture. Start with the 
  parameters of this task, and add the parameters of the later tasks in those 
  tasks.
- `defaultPatch()` gives a patch with the default value of every parameter.
- `createVoice(ctx, patch, midi, out)` builds: oscillator 1, oscillator 2, the 
  sub oscillator and the noise source, each with its own level, into a mixer, 
  and then a DC block filter (high pass, about 12 hertz).
- Waveforms: sine, triangle, sawtooth and pulse. The pulse comes from a 
  sawtooth, a delay and an inverter, as in the architecture. The width control 
  sets the delay time to `width / frequency`. Give the delay a maximum time that 
  is long enough for the lowest note.
- Octave: a whole number of octaves, -2 to 2. Detune: cents, -50 to 50.
- The sub oscillator is a square, one octave under oscillator 1. The noise is 
  one white noise buffer per context, shared by the voices.
- Write the test case `R2`.

**Acceptance criteria:**
- Every waveform gives a level that is not zero.
- The spectrum of a sine holds one strong partial. The spectrum of a sawtooth 
  holds a series of partials. A triangle holds less energy above the fifth 
  partial than a sawtooth.
- A detune of zero gives a level that does not move over one second. A detune of 
  10 cents gives a level that moves up and down.
- An octave of 1 gives a frequency that is two times the frequency at octave 0.
- A pulse width of 50 percent gives a level at the second partial that is at 
  least 20 decibel under the level at the first partial. A width of 25 percent 
  gives a second partial that is not that low.
- A level of zero for a source removes that source from the mix.

**Test result:** `npm test` gave `ok 3 - R2 - oscillator section`, with 
`# tests 3 / # pass 3 / # fail 0`. Measured on note A3 (220 Hz): the four 
waveforms all sound; the second partial of the sine is under 5 percent of the 
first; the sawtooth holds a second and a sixth partial; the triangle holds less 
energy above the fifth partial than the sawtooth; a detune of 0 gives a level 
spread under 5 percent and a detune of 10 cents over 50 percent; octave 0 gives 
220 Hz and octave 1 doubles it; a pulse width of 50 percent puts the second 
partial under -20 dB and a width of 25 percent keeps it; the sub sounds at 110 
Hz; every level at zero gives an rms under 1e-6.

### T4 - Filter section

**Description:** Add the filter to the voice: two low pass biquad filters in 
series, for 24 decibel per octave. The resonance goes to the Q of the second 
filter. The first filter keeps a flat Q.

- Controls: cutoff (exponential, 20 hertz to 18 kilohertz), resonance, envelope 
  amount (in cents, negative and positive) and keyboard tracking (0 to 1).
- The cutoff of the control goes to `frequency`. The keyboard tracking 
  multiplies it: `cutoff * 2^(track * (midi - 60) / 12)`.
- The filter envelope and the LFO go to `detune`, in cents. Here, make the 
  input node for it. Task T5 connects the envelope to it, and task T6 the LFO.
- Make the white noise come from a generator with a fixed seed, and not from 
  `Math.random`. The tests of the filter measure the corner frequency with 
  noise, because noise has the same spectrum at every note, and thus a change in 
  the corner comes from the filter and not from the note. With `Math.random` the 
  test gives a different result at each run.
- Write the test case `R3` with the checks of this task. Task T5 adds the 
  checks of the filter envelope to the same test case.

**Acceptance criteria:**
- A cutoff of 300 hertz gives less energy above 2 kilohertz than a cutoff of 
  8 kilohertz, for the same source.
- A resonance at the top gives a higher level in the band around the cutoff than 
  a resonance at the bottom.
- With the keyboard tracking at 1, the note one octave higher gives a corner 
  frequency one octave higher. The test measures this as the frequency under 
  which half of the energy lies.
- With the keyboard tracking at 0, the corner frequency does not change with the 
  note.

**Test result:** `node --test --test-name-pattern "^R3 " "tests/*.test.js"` gave 
`ok 1 - R3 - filter section`, with `# tests 1 / # pass 1 / # fail 0`. On a 
sawtooth at A2, a cutoff of 300 Hz left under 5 percent of the energy above 2 
kHz that a cutoff of 8 kHz left; a resonance of 14 lifted the band 900 to 1150 
Hz to more than two times the level at a resonance of 0.7. On noise with a 
cutoff of 1000 Hz, the half energy frequency stayed within 5 percent between C4 
and C5 at a tracking of 0, and doubled within 15 percent at a tracking of 1.

### T5 - Envelopes

**Description:** Add the two ADSR envelopes.

- The amplifier envelope acts on the gain of the VCA of the voice.
- The filter envelope is a constant source, shaped from 0 to 1, through a gain 
  that scales it to the envelope amount in cents, into the `detune` of the two 
  filters.
- Attack, decay and release are times, with an exponential control curve, from 1 
  millisecond to 10 seconds. Sustain is a level from 0 to 1.
- Use ramps, and give every ramp a length of at least 3 milliseconds. A jump 
  gives a click.
- The decay and the release go to their target with `setTargetAtTime`, because 
  an analog envelope falls like that, and a straight fall sounds hard. 
  `setTargetAtTime` comes near zero but never reaches it. Therefore the release 
  ends with a short straight ramp to exactly zero: without it, the stop of the 
  oscillators cuts a signal that is not zero, and that is a click.
- The release ends at a known time. The voice records that time. The engine uses 
  it for the voice count and for the stop of the oscillators.
- Write the test case `R4`, and add the checks of the filter envelope to the 
  test case `R3`. This task also implements the envelope part of R3.

**Acceptance criteria:**
- With an attack of 200 milliseconds, the peak of the level is near 200 
  milliseconds after the note on, and not at the start.
- With a longer attack, the peak is later.
- With a decay of 100 milliseconds and a sustain of 0.5, the level after 300 
  milliseconds is near half of the peak.
- With a sustain of 0, the level after the decay is near zero.
- After the note off, the level falls to near zero over the release time.
- The filter envelope with an amount of 3600 cents gives more high frequency 
  energy at the peak of the envelope than at the sustain.

**Test result:** `node --test --test-name-pattern "^(R3|R4) " "tests/*.test.js"` 
gave `ok 1 - R3 - filter section` and `ok 2 - R4 - envelopes`, with 
`# tests 2 / # pass 2 / # fail 0`. On a sine at A3: an attack of 200 ms put the 
peak at 187 ms and an attack of 400 ms later than that; a decay of 100 ms to a 
sustain of 0.5 gave 0.5 of the peak at 300 ms; a sustain of 0 gave under 2 
percent of the peak after the decay; after a note off at 500 ms with a release 
of 200 ms, the level was over half the peak before the note off and under 1 
percent at 850 ms. In R3, an envelope amount of +3600 cents gave over five times 
more energy in 1.5 to 6 kHz at the start than at the end, and an amount of -3600 
cents gave the opposite.

### T6 - LFO modulation

**Description:** Add one LFO to the voice.

- Controls: waveform (triangle, sine, square, sawtooth), rate (0.05 to 30 
  hertz), depth, and destination (pitch, filter, pulse width).
- Pitch goes to the `detune` of the oscillators, in cents. Filter goes to the 
  `detune` of the filters, in cents. Pulse width goes to the delay time of the 
  pulse oscillators.
- A depth of zero must give an output that is the same as the output without the 
  LFO. Thus the depth is a gain, and the LFO is always connected.
- Write the test case `R5`.

**Acceptance criteria:**
- With the destination pitch, a rate of 5 hertz and a depth that is not zero, 
  the frequency of the strongest partial moves over time. The number of times 
  that it moves up and down in one second is near 5.
- With the destination filter, the high frequency energy moves up and down over 
  time, at the rate of the LFO.
- With the destination pulse width, the level of the second partial moves over 
  time.
- With a depth of zero, the samples are the same as the samples of a render 
  without the LFO.

Note for the test of the pulse width: the level of the second partial of a pulse 
of width d follows `|sin(2*pi*d)|`. That has a top at d = 0.25 and a zero at 
d = 0.5. Sweep around 0.36, on the falling part. A sweep around 0.25 passes the 
top two times per cycle, and then the level moves at two times the rate of the 
LFO, and the test reads the wrong rate.

**Test result:** `node --test --test-name-pattern "^R5 " "tests/*.test.js"` gave 
`ok 1 - R5 - LFO modulation`, with `# tests 1 / # pass 1 / # fail 0`. With the 
destination pitch, a depth of 0.5 and a rate of 5 Hz, the strongest partial moved 
over a range of more than 12 Hz, 5 times per second. With the destination filter, 
the energy in 1.5 to 6 kHz moved over a factor 3, also 5 times per second. With 
the destination width and a rate of 4 Hz, the level of the second partial moved 
over a factor 2, 4 times per second. At a depth of zero, two renders with a 
different rate and a different destination gave exactly the same samples 
(largest difference 0).

### T7 - Voice manager

**Description:** Add the note logic to the engine.

- `noteOn` makes a voice and puts it in the list. `noteOff` starts the release 
  and records the end time.
- Eight voices at most. A ninth note takes the oldest voice: that voice gets a 
  fast release of about 5 milliseconds, and then a new voice starts.
- `voiceCount()` gives the number of voices whose end time is after 
  `ctx.currentTime`, as in the architecture. The live page also removes the 
  nodes at the `ended` event.
- Mono mode: one voice. A new note while a key is held does not start a new 
  voice. It changes the frequency of the voice that sounds, over the glide time. 
  The note that is released gives the note back to the key that is still held.
- Controls: mode (poly or mono) and glide time (0 to 2 seconds).
- Write the test case `R6`.

**Acceptance criteria:**
- Eight notes at the same time give eight voices, and the spectrum holds the 
  first partial of all eight notes.
- A ninth note gives eight voices, and the first partial of the oldest note is 
  gone.
- After all notes off, and after the release, `voiceCount()` is zero.
- In mono mode, two notes that are held give one voice.
- In mono mode with a glide of 200 milliseconds, the frequency of the strongest 
  partial at 100 milliseconds after the second note is between the two notes.

**Test result:** `npm test` gave `ok 7 - R6 - polyphony and mono mode`, with 
`# tests 7 / # pass 7 / # fail 0`. Eight notes at the same time gave 
`voiceCount()` of 8, and the first partial of the weakest note was over half of 
the strongest. A ninth note kept `voiceCount()` at 8, and the first partial of 
the oldest note fell to under a twentieth of the ninth note, while the other 
notes stayed. After eight notes off and the release, `voiceCount()` was 0. In 
mono mode two held notes gave one voice, and the newest held note sounded. With 
a glide of 200 ms, the pitch at 100 ms after the second note was 370 Hz, between 
262 and 523 Hz; with a glide of 0 it was already at 523 Hz.

### T8 - Delay and reverb

**Description:** Add the effects to the master chain, in this order: voice bus, 
delay, reverb, master.

- The delay is stereo: two delay lines with a different time, each with a 
  feedback gain and a low pass filter in the feedback path. Controls: time, 
  feedback, tone, mix and on/off.
- The reverb is a convolver. The impulse response is computed in the page: two 
  channels of noise with an exponential fall. Controls: size, mix and on/off. 
  The impulse response is computed again when the size changes.
- Each effect mixes a dry path and a wet path. Off gives a wet gain of zero.
- Write the test case `R8`.

**Acceptance criteria:**
- With the delay on, a time of 250 milliseconds, a feedback of 0.5 and a mix of 
  0.5, a short note gives a second peak near 250 milliseconds after the first.
- A feedback of 0.7 gives more peaks than a feedback of 0.2.
- With the reverb on and a mix of 0.5, the level at 300 milliseconds after the 
  end of a short note is higher than with the reverb off.
- With both effects off, the samples are the same as the samples of a render 
  without the effects, within 0.001.
- With the delay on, the left channel and the right channel are not the same.

**Test result:** `node --test --test-name-pattern "^R8 " "tests/*.test.js"` gave 
`ok 1 - R8 - delay and reverb`, with `# tests 1 / # pass 1 / # fail 0`. On a 
short note: a delay of 250 ms gave a repeat at 250 ms more than five times the 
level between the repeats; the largest difference between the left and the right 
channel was over 0.01; a feedback of 0.7 gave more repeats over the threshold 
than a feedback of 0.2; with the reverb on at size 2 s the level at 300 ms after 
the note was over twenty times the level with the reverb off; with both effects 
off the output was silent (under 1e-6) after the note, and two renders with very 
different effect controls gave exactly the same samples.

### T9 - Panel and knobs

**Description:** Build the panel from `PARAMS`.

- A knob is a `div` with `role="slider"`, an accessible name, and 
  `aria-valuemin`, `aria-valuemax`, `aria-valuenow` and `aria-valuetext`. It 
  holds an indicator that turns, and a readout with the value and the unit.
- A drag changes the value: up is more, down is less. Use pointer capture, so 
  that the knob follows the pointer outside the knob. The shift key gives a fine 
  drag. A double click sets the default value of the patch. The arrow keys 
  change the value, Home and End give the minimum and the maximum.
- A switch and a select follow the same rules, with the role that fits.
- Style: a dark panel, sections with a legend, a metal look from CSS gradients. 
  No image file.
- The layout is a grid. It fits in 1280 by 800 without a horizontal scroll bar.
- Every change writes to the engine with `setParam`.
- Write the test case `R10`.

**Acceptance criteria:**
- The panel holds a section for oscillators, filter, envelopes, LFO, effects and 
  master.
- A drag of 100 pixels up on the cutoff knob gives a higher value. A drag down 
  gives a lower value.
- A drag that ends outside the knob still changes the value, and the knob stops 
  at the pointer up.
- A double click gives back the default value.
- The arrow key up gives a higher value on the knob that has the focus.
- Every control has a name and a role that the accessibility tree gives.
- At 1280 by 800, `document.documentElement.scrollWidth` is not larger than 
  1280.

Each section holds a `cols` number: how many controls stand next to each other. 
It keeps the rows of the panel together, with oscillator 1 on one row and 
oscillator 2 under it, and the delay on one row and the reverb under it. Without 
it the controls flow over the rows and the panel is hard to read.

**Test result:** `node --test --test-name-pattern "^R10 " "tests/*.test.js"` gave 
`ok 1 - R10 - hardware style panel`, with `# tests 1 / # pass 1 / # fail 0`. The 
panel held the sections Oscillators, Filter, Filter Envelope, Amp Envelope, LFO, 
Effects and Master. Every one of the parameters had a control, with an 
accessible name and a role of slider, switch or select. A drag of 100 pixels up 
on the cutoff knob raised the value, a drag down lowered it, and a drag that 
ended 420 pixels outside the knob still changed it. The readout showed the unit, 
and the indicator held a rotate. A double click gave back 2200 Hz, the default. 
The arrow key up raised the value of the knob that had the focus, the arrow key 
down switched the delay switch off, and the new value was in the patch of the 
engine. `document.documentElement.scrollWidth` was not over 1280.

### T10 - On screen keyboard

**Description:** Build the keyboard.

- Three octaves of keys, white and black, drawn with CSS. Each key holds its 
  MIDI note number.
- Pointer down on a key starts the note. Pointer up stops it. A pointer that 
  moves over the keys with the button down stops the old note and starts the new 
  note. A pointer up outside the keyboard, a pointer cancel, and a window blur 
  stop every note.
- A key that sounds gets a class, and the class changes the appearance.
- An octave control moves the range. The keys then hold the notes of the new 
  range. A change of the octave stops the notes that sound.
- Write the test case `R7`.

**Acceptance criteria:**
- A pointer down on the key of C4 gives one voice. A pointer up gives zero 
  voices after the release.
- A pointer down on C4 and a move to E4 gives one voice, and the note that 
  sounds is E4.
- A pointer up outside the keyboard leaves no note on.
- The key that sounds has the class, and the class is not on the other keys.
- The octave up control moves the note of the first key by 12.

Count the notes that are held, and not the voices that sound, when testing a 
drag over the keys. The keys that the drag passed over are released, and a 
released voice still sounds over its release time. That is correct, and thus a 
count of the voices during a drag is not 1.

**Test result:** `node --test --test-name-pattern "^R7 " "tests/*.test.js"` gave 
`ok 1 - R7 - on screen keyboard`, with `# tests 1 / # pass 1 / # fail 0`. A 
press on the key of C4 gave one voice and put the class on that key alone; the 
release took the class off and the voice ended. A drag from C4 to E4 held only 
E4, and after the release no voice was left. A pointer that left the keyboard 
with the button down left no key on and no voice sounding. The octave up control 
moved the first key from 48 to 60 and the octave down control moved it back, and 
after an octave up the first key played its new note.

### T11 - Presets and storage

**Description:** Add the presets.

- At least six factory patches: a bass, a lead, a pad, a pluck, a brass and a 
  sweep. A factory patch is a partial patch: the values that it does not hold 
  are the default values.
- A select holds the factory patches and the user patches. A load sets the 
  engine and the panel.
- Save asks a name and writes the patch to `localStorage`, under the key 
  `voltage.patches.v1`. Remove takes it out.
- Export makes a JSON file and downloads it. Import reads a file with a file 
  input and loads the patch. The import uses the default value for a parameter 
  that the file does not hold, and it does not read a key that is not in 
  `PARAMS`.
- Every read and every write of the storage is in a try and catch. When the 
  storage does not work, the panel shows a message on the panel, and the export 
  and the import still work.
- Write the test case `R9`.

**Acceptance criteria:**
- The select holds at least six factory patches. A load of one of them sets the 
  controls to the values of that patch.
- A save, then a reload of the page, gives the patch in the select, and a load 
  gives the same values.
- A remove, then a reload of the page, does not give the patch in the select.
- The export gives JSON that holds every parameter of `PARAMS`. An import of 
  that JSON gives the same values.
- With a `localStorage` that throws, the page still loads, the message is on the 
  panel, and the export still gives the JSON.

The name of a patch is a text field on the panel, and not a dialog of the 
browser. A dialog stops the page and a test cannot reach it without a handler 
for it.

To read what the Export gives, replace `URL.createObjectURL` in the page before 
the click and read the blob. Thus the test reads exactly the file that the user 
gets, and it needs no download directory.

**Test result:** `node --test --test-name-pattern "^R9 " "tests/*.test.js"` gave 
`ok 1 - R9 - presets`, with `# tests 1 / # pass 1 / # fail 0`. The list held 7 
factory patches. A load of "Warm Pad" set every one of the parameters to the 
value of that patch, and the cutoff knob showed it. A patch saved under the name 
"My Test Patch" was in the list after a reload of the page and loaded with the 
same values; after a remove and a reload it was gone. Thus `localStorage` works 
for a page that comes from a `file://` URL in Chrome. The export held every 
parameter, and an import of that file gave the same values. With a 
`localStorage` that throws, the panel showed the message about the storage, the 
export still gave the full JSON, and the console held no error.

### T12 - Output stage and stability

**Description:** Finish the master chain and remove the clicks.

- Master volume, and then a soft clip with a wave shaper that uses a tanh curve. 
  The soft clip holds the output between -1 and 1, and it gives the sound the 
  warmth of an analog output stage.
- The curve is `tanh(x)` over an input of -1 to 1, with an odd number of 
  points, so that an input of exactly zero gives an output of exactly zero. Do 
  not give the curve a drive and then divide by `tanh(drive)` to bring the end 
  of the curve back to 1. That gives the curve a slope of `drive/tanh(drive)` at 
  zero, and then the stage is not a limiter but a distortion box: it lifts every 
  quiet sound, it adds harmonics at every level, and the sum of several notes 
  gets tones that no note played.
- Check every place where a gain or a frequency jumps. Use a ramp of at least 3 
  milliseconds. This holds for the note on, the note off, the voice steal and 
  every `setParam` on a voice that sounds.
- Free the nodes of a voice at the end of the release.
- Write the test case `R11`.

**Acceptance criteria:**
- A master volume of zero gives samples that are all zero. A higher master 
  volume gives a higher level.
- Around a note on, around a note off, and around a control that is turned while 
  the note sounds, the largest step between two samples is not larger than 1.2 
  times the largest step in the middle of the same note. See the note in the 
  requirement R11 about why this is not an absolute number.
- Eight notes at the same time, at the maximum level of every source, give a 
  peak that is not larger than 1.0, and the output is used (a peak over 0.5).
- After the release of all notes, the level falls under 0.001, and 
  `voiceCount()` is zero.

**Test result:** `npm test` gave `ok 9 - R11 - output stage and stability`, with 
`# tests 9 / # pass 9 / # fail 0`. A master volume of zero gave a peak of 
exactly 0, and a volume of 1 gave over 1.5 times the level of a volume of 0.3. 
On a pulse note, the largest step at the note on and at the note off stayed 
under 1.2 times the largest step in the middle of the note. A level that was 
turned up at 400 ms while the note sounded gave no larger step than the steady 
sound after it. Eight notes with every source at the maximum gave a peak that 
was not over 1.0 and over 0.5. After the release of all eight notes the last 
frame was under 0.001 and `voiceCount()` was 0.

This task also found two defects that the tests of the earlier tasks showed 
after the full suite ran again:
- The soft clip curve was normalized by `tanh(drive)`, and thus it coloured the 
  whole range instead of only the top. It is now `tanh(x)`.
- The test cases of R2, R4 and R6 measured the voice with the delay and the 
  reverb of the default patch still on, and thus they measured sound that the 
  voice did not make at that moment. They now switch both effects off. The 
  defaults of the solution did not change: the synthesizer must sound good when 
  it is opened.
