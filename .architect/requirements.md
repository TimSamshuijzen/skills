---
name: requirements
description: Requirements that the solution must satisfy.
---

# Document description

This document contains the name and description of the solution, and the 
requirements for the solution. The requirements are input for creating the 
architecture and implementation plan.

# Solution

Name: Voltage

Description: Voltage is a standalone HTML analog style polyphonic synthesizer 
that a user plays in a browser, without a server and without an install.

# Requirements

Each requirement has a row in the requirements table, and a detail section 
below the table with the same ID. The row holds the state. The detail section 
holds the text. Each row has one detail section, and each detail section has 
one row.

When making changes to the table, make sure the table format remains intact. 
The rows are sorted numerically by ID. Each row of the table is a single text 
line.

The requirements table has these columns:
- ID - Unique identifier of the requirement. ID is a number with prefix "R". A 
  new requirement gets the ID on the `Next ID` line above the table, and then 
  `Next ID` is increased by one. An ID is never reused, also not after the 
  requirement is removed. The test case for this requirement in the test suite 
  has the same ID.
- Name - A unique and short appropriate name of the requirement.
- State - State of the requirement:
  - `defined` - The requirement is defined, but it was not tested yet.
  - `pass` - The last test passed the acceptance criteria.
  - `fail` - The last test did not pass the acceptance criteria.
  - `deferred` - The user agreed that this requirement is not done now. Only 
    the user can decide this.

A requirement detail section has this format:

```
### R1 - Name of the requirement

**Description:** Definition of the requirement.

**Acceptance criteria:**
- Criteria that the solution must satisfy when testing and verifying.

**Test result:** What was observed in the last test: the command that was run, 
and the result that it gave. Write "Not tested yet" when there is no result.
```

## Requirements table

Next ID: R12

| ID | Name | State |
| --- | --- | --- |
| R1 | Standalone single file | pass |
| R2 | Oscillator section | pass |
| R3 | Filter section | pass |
| R4 | Envelopes | pass |
| R5 | LFO modulation | pass |
| R6 | Polyphony and mono mode | pass |
| R7 | On screen keyboard | pass |
| R8 | Delay and reverb | pass |
| R9 | Presets | pass |
| R10 | Hardware style panel | pass |
| R11 | Output stage and stability | pass |

## Requirement details

### R1 - Standalone single file

**Description:** The solution is one HTML file. The user opens the file from 
the file system in a modern browser and plays the synthesizer. No server, no 
install step, no build step and no network access are necessary. All style, 
script and sound data are inside the file.

**Acceptance criteria:**
- The solution runs from one file: `solution/synth.html`. No other file is 
  necessary to run it.
- The page opens from a `file://` URL and shows the panel.
- The page makes no network request.
- The page writes no error to the browser console during load and during play.
- The audio starts after the first pointer action of the user. Before that 
  action, the page shows that it waits for the user.

**Test result:** `npm test` in `solution/` gave `ok 2 - R1 - standalone single file`, in a run that reported `# tests 12 / # pass 12 / # fail 0`, the number 
of test cases that the test method gives. The test case opened the page from a 
`file://` URL and saw the start plate before the first click and an audio 
context that runs after it, zero network requests beside the page itself, an 
empty console, and no reference in the file to any other file.

### R2 - Oscillator section

**Description:** A voice holds two main oscillators, a sub oscillator and a 
noise source. Each main oscillator has a waveform, an octave setting and a 
detune setting. The waveforms are sine, triangle, sawtooth and pulse. The pulse 
waveform has a width control. The user sets the level of each of the four 
sources in the mix.

**Acceptance criteria:**
- Each of the four waveforms gives sound, and the spectrum agrees with the 
  waveform. A sine holds one strong partial. A sawtooth holds a series of 
  partials that fall in level. A triangle holds less high frequency energy than 
  a sawtooth at the same level.
- A detune of zero cents between the two oscillators gives a level that does 
  not move. A detune of 10 cents gives beating: the level moves up and down.
- An octave step changes the frequency of the oscillator by a factor two.
- A pulse width of 50 percent removes the even partials. A different width 
  gives even partials.
- The level control of a source changes the share of that source in the mix. A 
  level of zero removes the source from the mix.

**Test result:** `npm test` in `solution/` gave `ok 3 - R2 - oscillator section`, in a run that reported `# tests 12 / # pass 12 / # fail 0`, the number 
of test cases that the test method gives. Measured on note A3: the four 
waveforms all sound and their spectra agree with the waveform, a detune of 10 
cents beats where a detune of 0 does not, an octave step doubles the frequency, 
a pulse width of 50 percent puts the second partial under -20 dB, and a level of 
zero removes a source from the mix.

### R3 - Filter section

**Description:** A voice holds one resonant low pass filter after the 
oscillator mix. The user sets the cutoff frequency, the resonance, the amount 
of the filter envelope and the keyboard tracking.

**Acceptance criteria:**
- A low cutoff gives less high frequency energy in the output than a high 
  cutoff, for the same source.
- A higher resonance gives a higher level at the cutoff frequency.
- A filter envelope amount that is not zero moves the cutoff over time. A 
  positive amount opens the filter at the attack. A negative amount closes it.
- With keyboard tracking at full, a note one octave higher gives a cutoff one 
  octave higher. With tracking at zero, the cutoff does not change with the 
  note.

**Test result:** `npm test` in `solution/` gave `ok 4 - R3 - filter section`, in a run that reported `# tests 12 / # pass 12 / # fail 0`, the number 
of test cases that the test method gives. A cutoff of 300 Hz left under 5 percent of 
the energy above 2 kHz that a cutoff of 8 kHz left, a resonance of 14 lifted the 
band at the cutoff over a factor 2, the keyboard tracking at 1 moved the corner 
frequency by an octave with the note and at 0 did not move it, and an envelope 
amount of +3600 and -3600 cents opened and closed the filter over time.

### R4 - Envelopes

**Description:** A voice holds two ADSR envelopes. One controls the amplifier. 
One controls the filter cutoff. Each envelope has an attack time, a decay time, 
a sustain level and a release time.

**Acceptance criteria:**
- After a note on, the level rises over the attack time, falls over the decay 
  time, and then holds the sustain level.
- After a note off, the level falls to silence over the release time.
- A longer attack time gives a later peak.
- A sustain level of zero gives silence after the decay time.
- The filter envelope acts on the cutoff with the same four stages.

**Test result:** `npm test` in `solution/` gave `ok 5 - R4 - envelopes`, in a run that reported `# tests 12 / # pass 12 / # fail 0`, the number 
of test cases that the test method gives. An attack of 200 ms put the peak at 187 ms and 
a longer attack put it later, a decay of 100 ms to a sustain of 0.5 gave half of 
the peak at 300 ms, a sustain of 0 gave silence after the decay, and the level 
fell to under 1 percent of the peak over the release time after the note off.

### R5 - LFO modulation

**Description:** The synthesizer holds one LFO per voice. The user sets the 
waveform, the rate, the depth and the destination. The destinations are pitch, 
filter cutoff and pulse width.

**Acceptance criteria:**
- With the destination pitch and a depth that is not zero, the pitch moves up 
  and down at the rate of the LFO.
- With the destination filter, the high frequency energy moves up and down at 
  the rate of the LFO.
- With the destination pulse width, the spectrum moves at the rate of the LFO.
- A depth of zero gives an output that is the same as the output without the 
  LFO.

**Test result:** `npm test` in `solution/` gave `ok 6 - R5 - LFO modulation`, in a run that reported `# tests 12 / # pass 12 / # fail 0`, the number 
of test cases that the test method gives. With the destination pitch the strongest 
partial moved 5 times per second, with the destination filter the energy in 1.5 
to 6 kHz moved 5 times per second, with the destination width the second partial 
moved 4 times per second at a rate of 4 Hz, and a depth of zero gave exactly the 
same samples whatever the rate and the destination.

### R6 - Polyphony and mono mode

**Description:** The synthesizer plays up to eight notes at the same time. When 
a ninth note starts, the oldest note stops. The user switches the synthesizer 
to mono mode. In mono mode the synthesizer plays one note, and glides from the 
old note to the new note over the glide time.

**Acceptance criteria:**
- Eight notes that start at the same time all sound. The output holds the 
  partials of all eight notes.
- A ninth note stops the oldest note. The number of voices that sound stays 
  eight.
- After a note off and after the release time, the voice is removed. After all 
  notes are off, the number of voices is zero.
- In mono mode, two notes that are held at the same time give one voice.
- In mono mode, with a glide time that is not zero, the pitch moves over the 
  glide time from the old note to the new note.

**Test result:** `npm test` in `solution/` gave `ok 7 - R6 - polyphony and mono mode`, in a run that reported `# tests 12 / # pass 12 / # fail 0`, the number 
of test cases that the test method gives. Eight notes at the same time all 
sounded and gave eight voices, a ninth note kept eight voices and took the 
oldest note away while the others stayed, no voice was left after the release, 
two held notes in mono mode gave one voice that sounds the newest note, and a 
glide of 200 ms put the pitch between the two notes after 100 ms.

### R7 - On screen keyboard

**Description:** The panel holds a keyboard. The user plays it with the mouse 
or with a touch screen. The keyboard shows which notes sound. The user moves 
the range of the keyboard up and down in octaves.

**Acceptance criteria:**
- A pointer down on a key starts the note of that key. A pointer up stops it.
- A pointer that leaves the page or the keyboard with the button down stops the 
  note. No note stays on.
- A pointer that moves over the keys with the button down stops the old note 
  and starts the note of the key under the pointer.
- A key whose note sounds has a different appearance than a key that does not 
  sound.
- The octave control moves the range of the keyboard by one octave per step. 
  The keys then play the notes of the new range.

**Test result:** `npm test` in `solution/` gave `ok 9 - R7 - on screen keyboard`, in a run that reported `# tests 12 / # pass 12 / # fail 0`, the number 
of test cases that the test method gives. A press on the key of C4 started one 
voice and put the class on that key alone, the release stopped it, a drag to E4 
held only E4, a pointer that left the keyboard with the button down left no note 
on and no voice sounding, and the octave controls moved the range by 12 and the 
keys then played the notes of the new range.

### R8 - Delay and reverb

**Description:** The mix of all voices passes a stereo delay and then a reverb. 
Each effect has its own controls and an on/off switch. The reverb uses an 
impulse response that the solution computes itself.

**Acceptance criteria:**
- With the delay on and a mix that is not zero, the output holds a repeat of 
  the sound after the delay time.
- A higher feedback gives more repeats that fall in level.
- With the reverb on and a mix that is not zero, the output continues after the 
  voice is silent.
- With an effect off, the output is the same as the output of the dry signal, 
  within the tolerance of the test.
- The left channel and the right channel of the delay are not the same.

**Test result:** `npm test` in `solution/` gave `ok 8 - R8 - delay and reverb`, in a run that reported `# tests 12 / # pass 12 / # fail 0`, the number 
of test cases that the test method gives. A delay of 250 ms gave a repeat at 250 
ms over five times the level between the repeats, a feedback of 0.7 gave more 
repeats than 0.2, the reverb still sounded 300 ms after a short note, both 
effects off gave silence after the note and exactly the same samples whatever 
their controls said, and the left and the right channel of the delay differed.

### R9 - Presets

**Description:** The synthesizer holds factory patches. The user saves the 
current patch under a name, loads a patch and removes a patch. The user exports 
a patch to a file and imports a patch from a file. A patch holds the value of 
every control.

**Acceptance criteria:**
- The list holds at least six factory patches. A load of a factory patch sets 
  every control to the value of that patch.
- A patch that the user saves is in the list after a reload of the page, and a 
  load of it gives the same control values.
- A patch that the user removes is not in the list after a reload of the page.
- An export gives a file that holds the patch as JSON. An import of that file 
  gives the same control values.
- When the browser storage is not available, the panel shows a message, and 
  export and import still work.

**Test result:** `npm test` in `solution/` gave `ok 10 - R9 - presets`, in a run that reported `# tests 12 / # pass 12 / # fail 0`, the number 
of test cases that the test method gives. The list held 7 factory patches and a load of one 
set every control, a saved patch was in the list and loaded with the same values 
after a reload of the page, a removed patch was gone after a reload, the export 
held every parameter and an import of that file gave the same values, and with a 
browser storage that throws the panel showed the message, the export still 
worked and the console held no error.

### R10 - Hardware style panel

**Description:** The user interface looks like the front panel of a hardware 
synthesizer. It is dark, it holds a section per part of the signal path, and it 
holds rotary knobs and switches. The user changes a knob with a drag. The panel 
is also usable with the keyboard.

**Acceptance criteria:**
- The panel holds a section with a label for each part of the signal path: 
  oscillators, filter, envelopes, LFO, effects and master.
- A drag up on a knob gives a higher value. A drag down gives a lower value. 
  The knob follows the pointer until the pointer goes up, also outside the knob.
- A knob shows its value as a number with its unit, and as a position of its 
  indicator.
- A double click on a knob sets it back to the default value of the patch.
- Each control has an accessible name and an accessible role. The arrow keys 
  change the value of the control that has the focus.
- The panel fits in a window of 1280 by 800 pixels without a horizontal scroll 
  bar.

**Test result:** `npm test` in `solution/` gave `ok 11 - R10 - hardware style panel`, in a run that reported `# tests 12 / # pass 12 / # fail 0`, the number 
of test cases that the test method gives. The panel held the sections 
Oscillators, Filter, Filter Envelope, Amp Envelope, LFO, Effects and Master, 
every parameter had a control with an accessible name and a role, a drag up 
raised and a drag down lowered the value and a drag that ended 420 pixels 
outside the knob still changed it, the readout showed the unit and the indicator 
turned, a double click gave back the default, the arrow keys changed the control 
that had the focus, and `scrollWidth` was not over 1280.

### R11 - Output stage and stability

**Description:** The mix passes a master volume control and a limiter before it 
goes to the output. Notes start and stop without clicks. The solution removes 
the voices that it no longer needs.

**Acceptance criteria:**
- The master volume control changes the level of the output. A volume of zero 
  gives samples that are all zero.
- A note on, a note off, and a control that the user turns while the note 
  sounds, give no step between two sample values that is larger than 1.2 times 
  the largest step in the middle of the note.
- Eight notes at the same time, at full level, give a peak sample value that is 
  not larger than 1.0.
- After the release of all notes, the level of the output falls to silence, and 
  the number of voices is zero.

A click is a step between two samples that is much larger than the steps that 
the waveform itself makes. An absolute number does not measure that: a sawtooth 
at a normal level already steps far more between two samples than a sine does, 
and that step is the waveform and not a defect. Therefore the criterion 
compares the steps at the note on, at the note off and at the control change 
with the steps in the middle of the same note.

**Test result:** `npm test` in `solution/` gave `ok 12 - R11 - output stage and stability`, in a run that reported `# tests 12 / # pass 12 / # fail 0`, the number 
of test cases that the test method gives. A master volume of zero gave 
samples that are all zero and a higher volume gave a higher level, the largest 
step at the note on, at the note off and at a knob that was turned while the note 
sounded stayed under 1.2 times the largest step in the middle of the note, eight 
notes with every source at the maximum gave a peak that is not over 1.0, and 
after the release of all notes the level fell under 0.001 with no voice left.
