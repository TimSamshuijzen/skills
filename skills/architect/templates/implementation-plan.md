---
name: implementation-plan
description: Implementation plan for implementing the solution.
---

# Document description

This document defines the implementation plan for implementing the solution. It 
is a table with a sequential list of implementation tasks. The "Implementation 
task description" column contains instructions for guiding the developer to 
what is expected of the implementation task, such as selecting tools or design 
decisions.


# Implementation plan

The implementation plan is to work according to a series of "implementation 
tasks".

The implementation tasks table (see table below) lists the tasks required for 
implementing the solution. The rows are sorted by logical and testable stages.

When making changes to the table, make sure the table format remains intact. 
Each row of the table is a single text line. When a cell value has newlines, 
use html break \<br\> for newlines. When a cell value has a pipe symbol, then 
escape it. 

The implementation task table has these columns:
- Name - Short unique name of the implementation task.
- Description - Description of the sub-tasks for this implementation task.
- Acceptance criteria - Criteria that the solution must satisfy when testing.
- Test result - Whether acceptance criteria were passed in last test.
- Requirement IDs - Comma-separated list of requirement IDs, to verify after 
  successful test according to test criteria of this task. This cell may be 
  empty, indicating that requirements testing is not needed after this task.
- State - `planned`, `pass`


## Implementation tasks table

| Name | Description | Acceptance criteria | Test result | Requirement IDs | State |
| --- | --- | --- | --- | --- | --- |

