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
  failed, or for a requirement that changed.
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

Next ID: T1

| ID | Name | Requirements | Changed | State |
| --- | --- | --- | --- | --- |

## Implementation task details
