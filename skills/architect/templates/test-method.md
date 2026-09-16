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
get the same result. Thus prefer a test that a command can run. Use a manual 
test only when a command cannot do the test.

If the test method needs scripts or fixtures, then place these in the 
`solution/tests/` directory (create the directory when needed).

Fill in the sections below, and keep them up to date. Replace the comment in 
each section with the method for this solution.

# How to test the solution during implementation tasks and requirements verification

## Preparation

<!-- What must be installed, built or started before a test can run, and how to 
stop it again. -->

## How to run the tests

<!-- The command that runs all tests. The command that runs one single test. -->

## How to read the result

<!-- What output shows that a test passed. What output shows that a test 
failed. What to copy into the test result cell as the record of the test. -->

## Manual tests

<!-- The steps for the tests that a command cannot do. If there are none, then 
write "None". -->
