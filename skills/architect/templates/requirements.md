---
name: requirements
description: Requirements that the solution must satisfy.
---

# Document description

This document contains the name and description of the solution, and the 
requirements for the solution. The requirements are input for creating the 
architecture and implementation plan.

# Solution

Name: 

Description: 

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

Next ID: R1

| ID | Name | State |
| --- | --- | --- |

## Requirement details
