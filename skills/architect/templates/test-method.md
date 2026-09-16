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

# How to test the solution during implementation tasks and requirements verification

## Preparation

<!-- What must be installed, built or started before a test can run, and how to 
stop it again. -->

## Where the tests are

<!-- The directory in the solution that holds the test scripts and fixtures. -->

## How to run the tests

Test cases: 0

<!-- The command that runs the full test suite. The command that runs one 
single test case by its ID. If a command cannot test any requirement of this 
solution, then write "No automated tests" here. Keep the `Test cases:` line 
above this comment, and correct its number each time that a test case is added 
or removed. -->

## How to read the result

<!-- What output shows that a test case passed. What output shows that a test 
case failed. Where the report gives the result per test case ID. What to copy 
into the test result as the record of the test. -->

## Manual tests

<!-- The requirement IDs that a command cannot test, and the steps for each of 
these tests. If there are none, then write "None". -->

## Final check

Not done

<!-- The record of the last check of all manual tests. This check is done one 
time, after all implementation tasks and all requirements pass. Write "Not 
done" when the check must still be done. When the check passed, replace "Not 
done" with the date, what was run, and the result. -->
