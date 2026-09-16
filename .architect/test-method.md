---
name: test-method
description: How to test the solution, or parts of the solution, during implementation, testing and verification.
---

# Document description

This document provides the method for testing the solution, or parts of the 
solution, during implementation tasks, and during requirements verification.

The acceptance criteria in `requirements.md` and `implementation-plan.md` tell 
you what to test. This document tells you how to test it.

A test must be repeatable. A new session must be able to do the same test and 
get the same result.

Fill in the sections below, and keep them up to date. Replace the comment in 
each section with the method for this solution. Two lines are not part of a 
method, and thus they stay as lines of their own: the `Test cases:` line in 
the `## How to run the tests` section, and the line above the comment in the 
`## Final check` section. The `## Final check` section holds a state, not a 
method: keep its comment, and change only the line above it.

The `Test cases:` line holds the number of test cases that a full run must 
report. It is the number of test cases that the test suite holds now, and it 
is zero when the suite is still empty. Correct it each time that a test case 
is added or removed. A number that does not agree with the suite makes every 
later run a failed run.

The suite holds only test cases that carry a requirement ID or an 
implementation task ID, and each ID has one test case. A test case without an 
ID, and a test case that the technology expands into more than one reported 
test case, make the report disagree with the number.

# How to test the solution during implementation tasks and requirements verification

## Preparation

The solution itself needs no preparation. It is one HTML file, and a browser 
opens it from the file system.

The tests need these:
- Node.js version 22 or higher. It holds the test runner `node --test`.
- Google Chrome, installed on the machine. The tests drive this Chrome. They do 
  not download a browser.
- The development dependency `playwright-core`. Install it one time:

```
cd solution
npm install
```

Nothing must be started or stopped by hand. The harness starts Chrome without a 
window at the start of the run, and closes it at the end of the run.

## Where the tests are

The tests are in `solution/tests/`:
- `solution/tests/synth.test.js` - the test suite. It holds one test case per 
  requirement ID and per implementation task ID.
- `solution/tests/lib/harness.js` - the harness. It starts Chrome, opens 
  `solution/synth.html` from a `file://` URL, and gives a fresh page per test 
  case. It also holds the analysis bundle that it installs in the page, which 
  renders the engine offline and measures the result. The harness is in the 
  `lib/` directory, and thus the pattern `tests/*.test.js` does not match it and 
  the runner does not read it as a test file.

The solution has no fixture file. A test that needs a patch or a file makes it 
in the test itself.

## How to run the tests

Test cases: 12

Run the full suite from the `solution/` directory:

```
npm test
```

This runs `node --test "tests/*.test.js"`. Node expands the pattern itself. Do 
not give the runner a directory: `node --test tests/` tries to load `tests` as a 
module, and the run fails before a test case runs.

Run one single test case by its ID, for example R3:

```
node --test --test-name-pattern "^R3 " "tests/*.test.js"
```

The name of each test case starts with its ID and a space, for example 
`R3 - filter section`. Thus the pattern `^R3 ` gives exactly one test case.

## How to read the result

The runner writes a line per test case: `ok 1 - R1 - standalone single file` 
when the test case passed, and `not ok 1 - ...` when it failed. A failed test 
case is followed by the assertion, with the expected value and the actual 
value.

At the end the runner writes a summary:

```
# tests 12
# pass 12
# fail 0
```

- The run is a real run when `# tests` is the same as the `Test cases:` number 
  above. When it is not the same, the run is a failed run. Find the cause 
  first, as the skill describes.
- A requirement passes when the line of its ID is `ok`.
- Copy into the test result: the command, the `ok` or `not ok` line of that ID, 
  and the summary line `# tests / # pass / # fail`. For a failure, also copy the 
  assertion.

## Manual tests

None. Every requirement of this solution can be tested by a command. The 
harness drives a real Chrome, and thus a test can do what a user does: click a 
key, drag a knob and read the panel. The harness renders the sound through an 
`OfflineAudioContext`, and thus a test can look at the sample values of the 
same engine that the user hears.

Two things are still not tested by a command, and they are not requirements:
whether the solution sounds pleasant, and whether it works in a browser that is 
not Chrome.

## Final check

2026-09-16, passed. There are no manual tests, and thus there was no manual test 
to do again. What was run and what it gave:
- `npm test` in `solution/`: the 12 test cases of the suite, `# tests 12 / 
  # pass 12 / # fail 0`. The number agrees with the `Test cases:` line above, 
  and thus the run is a real run.
- `node --test --test-name-pattern "^R3 " "tests/*.test.js"`: the command for 
  one single test case gave `ok 1 - R3 - filter section`, `# tests 1`.
- `.architect/architecture.md` was read against the solution: the layers, the 
  components, the audio graph, the patch model and both interfaces agree with 
  `solution/synth.html` as it is now.
- `solution/README.md` was read against the solution: `npm install` and 
  `npm test` are the commands that were run here, and the command for one test 
  case is the one above. The solution itself needs no install: `synth.html` is 
  one file of 68 kB, and `solution/` holds no other file that it needs to run.

<!-- The record of the last check of all manual tests. This check is done one 
time, after all implementation tasks and all requirements pass. Write "Not 
done" when the check must still be done. When the check passed, replace "Not 
done" with the date, what was run, and the result. -->
