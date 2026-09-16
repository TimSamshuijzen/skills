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
get the same result. Thus prefer a test that a command can run. 

Give each requirement a test case in the test suite. Give the test case the 
same ID as the requirement. Thus one run of the full suite gives the result for 
each requirement, in one report.

Use a manual test only when a command cannot do the test. A manual test is 
costly, because it must be done again each time that the requirement is 
verified. Keep the number of manual tests low.

The test scripts and fixtures are in the `.architect/solution/tests/` directory 
(create the directory when needed).

Fill in the sections below, and keep them up to date. Replace the comment in 
each section with the method for this solution.

# How to test the solution during implementation tasks and requirements verification

## Preparation

<!-- What must be installed, built or started before a test can run, and how to 
stop it again. -->

## How to run the tests

<!-- The command that runs the full test suite. The command that runs one 
single test case by its ID. -->

## How to read the result

<!-- What output shows that a test case passed. What output shows that a test 
case failed. Where the report gives the result per test case ID. What to copy 
into the test result cell as the record of the test. -->

## Manual tests

<!-- The requirement IDs that a command cannot test, and the steps for each of 
these tests. If there are none, then write "None". -->
