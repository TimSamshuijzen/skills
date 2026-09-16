---
name: implementation-plan
description: Implementation plan for implementing the solution.
---

# Document description

This document defines the implementation plan for implementing the solution. It 
is a table with a sequential list of implementation tasks. The implementation 
task description contains instructions for guiding the developer to what is 
expected of the implementation task, such as selecting tools or design 
decisions.


# Implementation plan

The implementation tasks table (see table below) lists the tasks required for 
implementing the solution. The rows are sorted by logical and testable stages.

When making changes to the table, make sure the table format remains intact. 
Each row of the table is a single text line. When a cell value has newlines, 
use html break \<br\> for newlines. When a cell value has a pipe symbol, then 
escape it. 

The implementation task table has these columns:
- Name - Short unique name of the implementation task.
- Requirements - The IDs of the requirements in `requirements.md` that this 
  task implements. Separate multiple IDs with a comma, for example "R1, R3". 
  This column makes it possible to find the tasks for a requirement that 
  failed, or for a requirement that changed.
- Description - Description of the sub-tasks for this implementation task.
- Acceptance criteria - Criteria that the implementation task must satisfy when 
  testing.
- Test result - What was observed in the last test: the command that was run, 
  and the result that it gave.
- State - State of the implementation task:
  - `planned` - The task is planned, but it is not done or not tested yet.
  - `pass` - The last test passed the acceptance criteria.
  - `fail` - The task was done, but the last test did not pass the acceptance 
    criteria.

Each requirement must have at least one implementation task that implements it.


## Implementation tasks table

| Name | Requirements | Description | Acceptance criteria | Test result | State |
| --- | --- | --- | --- | --- | --- |

