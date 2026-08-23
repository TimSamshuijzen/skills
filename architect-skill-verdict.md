---
name: architect-skill-verdict
description: Review verdict on the architect skill.
---

# Verdict on the architect skill

## 1. Scope of this review

I read these files:

- `skills/architect/SKILL.md`
- `skills/architect/templates/requirements.md`
- `skills/architect/templates/architecture.md`
- `skills/architect/templates/implementation-plan.md`
- `README.md`

This document keeps the technical names of the skill, for example
"requirement", "implementation plan" and "state". ASD-STE100 does not approve
some of these words. They stay in this text, because they are the technical
names of the skill.

## 2. Verdict

The architect skill is good. Approve it, but correct three items first.

The design is simple and the agent can continue its work after a session
reset. The traceability from a requirement to an implementation step is
correct. You can use the skill now for small solutions.

Correct these items before you use the skill for a real solution:

1. The skill does not define how to do a check of a requirement.
2. The skill does not do a new check of the requirements after a change
   request.
3. The loop in Step 2 has no end condition when a requirement stays at `fail`.

## 3. Strong points

- The workflow has four steps with one topic for each step.
- The file `architect.json` keeps the step number, so the work continues after
  a session reset.
- The state columns give a record of progress in the two tables.
- The Requirement IDs column gives traceability from a step to a requirement.
- The templates define each state and each column.
- The skill tells the agent to keep the solution simple
  (`SKILL.md:136`).
- The skill tells the agent to update the documents when the implementation is
  different from the plan (`SKILL.md:171` to `SKILL.md:177`).
- The user can ask a question at any time, and the agent stops the workflow
  (`SKILL.md:50` to `SKILL.md:51`).

## 4. Problems

### 4.1 High: the check of a requirement is not defined

- Location: `SKILL.md:190` to `SKILL.md:195`.
- Problem: the skill tells the agent to set the state to `pass` or to `fail`.
  It does not tell the agent how to get this result. It does not tell the
  agent to start the solution, to write a test, or to keep the result of the
  test.
- Effect: the agent can read the code and then set the state to `pass`. The
  solution is then not tested.
- Correction: add these instructions to Step 2. Do a test of each requirement
  against its acceptance criteria. Start the solution, or run an automatic
  test. Write the command, the result and the date in the Notes column of the
  requirements table.

### 4.2 High: no new check after a change request

- Location: `SKILL.md:218` to `SKILL.md:225`.
- Problem: a change request changes the requirements and sets the step number
  to 1. The requirements that have state `pass` keep that state.
- Effect: a change can break a function that passed earlier. Nothing finds
  this fault.
- Correction: after a change request, set the state of all requirements to
  `defined`. As an alternative, do a check of all requirements again at the
  end of Step 2, and not only the requirements that have state `fail`.

### 4.3 High: the loop in Step 2 has no end condition

- Location: `SKILL.md:194` to `SKILL.md:199`.
- Problem: the skill tells the agent to continue until all requirements pass.
  The escape rule applies only to an implementation step. If all
  implementation steps have state `done` and one requirement stays at `fail`,
  the skill gives no instruction.
- Effect: the agent can stay in an endless loop. It can also change the code
  many times without control.
- Correction: add a limit, for example three attempts for each requirement.
  After the limit, stop. Write the problem in the Notes column and ask the
  user what to do.

### 4.4 Medium: a markdown table is a weak store for long text

- Location: `templates/requirements.md:41`,
  `templates/implementation-plan.md:52`.
- Problem: the description, the acceptance criteria and the implementation
  notes go into one table cell. This text becomes long. A line break or a "|"
  character breaks the table format. The templates tell the agent to keep the
  table format intact, but this is difficult.
- Effect: the state record becomes damaged. The agent then loses its record of
  progress.
- Correction: keep only the short fields in the table: ID, name, Requirement
  IDs and state. Put the long text below the table, with one heading for each
  ID.

### 4.5 Medium: the architecture template is empty

- Location: `templates/architecture.md:11` to `templates/architecture.md:15`.
- Problem: the other two templates give a full structure. The architecture
  template gives only one heading.
- Effect: the content of the architecture document is different for each
  solution. Some important data can be missing.
- Correction: add headings to the template, for example: Overview, Components,
  Data model, Interfaces, External dependencies, Decisions with their reason,
  and Risks.

### 4.6 Medium: the technology preference is not stored

- Location: `SKILL.md:130` to `SKILL.md:134`, and the content of
  `solution.json` at `SKILL.md:75` to `SKILL.md:80`.
- Problem: the skill uses Node.js and a single page HTML front end as the
  default. The agent uses a different technology only if the user gives the
  skills of the development team. The skill does not ask for these skills, and
  it does not keep the answer.
- Effect: after a session reset, the agent can select a different technology.
- Correction: ask for the technology and the team skills in Step 0. Add these
  fields to `solution.json`. Read them in Step 1.

### 4.7 Medium: the test approach is not part of the plan

- Location: `SKILL.md:145` to `SKILL.md:151`.
- Problem: the skill does not tell the agent to put test steps in the
  implementation plan. It does not give a location for the test files.
- Effect: the solution has no automatic test. Then the check in Step 2 is a
  manual check only, and it is not reproducible.
- Correction: tell the agent to add one or more test steps to the
  implementation plan. Give a location for the tests, for example
  `solution/tests/`.

### 4.8 Medium: the description in the frontmatter is too wide

- Location: `SKILL.md:3`.
- Problem: the description contains the words "implementing the solution". An
  agent can start this skill in a project that has no architect files.
- Effect: the skill starts at the wrong time. It then makes `solution.json`
  and `architect.json` in a project that does not need them.
- Correction: make the condition narrow. Start the skill when the user speaks
  to the agent as "architect", or when the file `architect.json` is in the
  current working directory.

### 4.9 Low: the rule on ASD-STE100 is not firm

- Location: `SKILL.md:35` to `SKILL.md:36`.
- Problem: the text gives two options: ASD-STE100 or plain technical English.
  The word "or" makes the rule weak.
- Correction: select one option. If you select ASD-STE100, then point to the
  skill `skills/asd-ste100/`.

### 4.10 Low: a bad step number has no rule

- Location: `SKILL.md:84` to `SKILL.md:94`.
- Problem: the skill reads the step number from `architect.json`. It gives no
  rule for a missing field or for a number that is not 1, 2 or 3.
- Correction: add a rule. If the step number is not 1, 2 or 3, set it to 1.

### 4.11 Low: Step 0 and the pause rule can be in conflict

- Location: `SKILL.md:50` to `SKILL.md:51`, and `SKILL.md:64` to
  `SKILL.md:65`.
- Problem: one rule tells the agent to stop the workflow and answer the user.
  The other rule tells the agent to always start with Step 0.
- Correction: write the sequence clearly. In a new session, do Step 0 first.
  Then answer the question of the user.

### 4.12 Low: a change request cannot remove a requirement

- Location: `SKILL.md:213` to `SKILL.md:222`.
- Problem: the text speaks only about an addition to a requirement and about a
  change in a requirement.
- Correction: add the third case. A change request can also remove a
  requirement. Then mark the related implementation steps and the code that is
  no longer necessary.

### 4.13 Low: no protection for the files in the solution directory

- Location: `SKILL.md:163` to `SKILL.md:166`.
- Problem: the skill does not tell the agent to look at the content of
  `solution/` before it writes a file.
- Correction: tell the agent to look at an existing file first, and to ask the
  user before it removes or replaces work that is not in the implementation
  plan.

## 5. Recommended sequence of corrections

1. Add the test procedure to Step 2 (item 4.1).
2. Add the new check of the requirements after a change request (item 4.2).
3. Add the attempt limit to Step 2 (item 4.3).
4. Move the long text out of the two tables (item 4.4).
5. Give a structure to the architecture template (item 4.5).
6. Add the technology fields to `solution.json` (item 4.6).
7. Add the test steps and the test location to Step 1 (item 4.7).
8. Make the frontmatter description narrow (item 4.8).
9. Correct the low items (item 4.9 to item 4.13).

## 6. Summary

The architect skill has a correct structure and a good state record. Its
weakness is the check of the solution against the requirements. Correct the
three high items, and the skill is ready for use.
