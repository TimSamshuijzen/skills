# Verdict on the architect skill

Date: 2026-09-16

Reviewed: `skills/architect/SKILL.md`, the four files in
`skills/architect/templates/`, and the `architect` section of `README.md`.

Status: defects 1 to 4 were fixed on 2026-09-16. Defects 5 to 7 are open, and
all three are cosmetic. Line references below point at the current file (531
lines).


## Verdict

Ship it. The design is sound and unusually disciplined about the two things
that normally break agent workflows: proof that a test actually ran, and state
that survives a session reset. The workflow had two control-flow holes that a
long unattended run would have found. One was a dead end at the end of
verification. The other made deferral, the skill's own escape hatch, loop
instead of stop. Both are now closed, together with two smaller gaps: a
consistency repair that hid unfinished planning, and a handoff README that no
step created.

The README already says the workflow is new and unproven. That is still the
right label, and the way to retire it is a long project, not more review. What
remains open is wording, not behaviour.


## What is good

- **State lives in the documents, not in the agent.** Three explicit carriers
  (requirement states, task states plus the `Changed` column, the final check
  record) and no separate state file. SKILL.md:54-58 states the reason: the
  documents and the state cannot disagree. This is what makes the "reset the
  session and continue" claim in the README real rather than hopeful.
- **The rules for testing (SKILL.md:118-152) are the strongest part.** "A test
  that did not run is not a pass." "A test run that reports no test cases at
  all, or fewer test cases than the test method says it must report, is a
  failed run. Do not read it as 'nothing failed'." These catch the exact
  failure modes that let an agent report green on a suite that silently
  matched zero files. Requiring the command and its result to be recorded as
  evidence is the right level of paranoia.
- **The `Changed` column** (SKILL.md:371-373, 403-413) solves a real problem
  cheaply: it is the only way to know which costly manual tests can be skipped
  on the next verification pass, and it is readable by a new session. Emptying
  it at the end of Part B is correct bookkeeping.
- **`solution/` sits outside `.architect/`,** with the reason given
  (SKILL.md:66-70): the user must be able to find, run and ship it, and the
  toolchain must see it. Correct call, and the handoff README requirement
  follows from it.
- **ID discipline** (SKILL.md:76-89). The `Next ID` line exists because the
  highest ID in a table stops being a reliable watermark after a removal. The
  rationale is stated, so an agent will not "helpfully" reuse an ID.
- **The frontmatter description** names concrete trigger phrases and declares
  the side effect (it creates two directories). The negative clause keeps it
  from firing on general architecture questions.


## Defects

### 1. Part B has no exit to the final check. Blocker. Fixed.

The old ending of Part B gave it exactly two exits: back to step 1 if the
architecture or plan is wrong, otherwise back to Part A. The final check was a
floating section whose trigger ("when all implementation tasks and all
requirements have the state `pass` or `deferred`") was never reached from
anywhere.

An agent that follows the text arrives at: Part B ends, go to Part A, Part A
skips every task because all are `pass`, Part A ends with "continue with part
B", Part B runs the full suite again. That is a loop, and each turn of it is a
full test run. Reaching step 3 depended on the agent noticing the orphan
section instead of following the instruction it was given.

Fixed at SKILL.md:448-453. Part B now ends with an ordered three-way exit, in
the same "use the first rule below that applies" shape that step 0 already
uses:

```
Then think hard. Look for a way to get everything consistent and working and
verified. Then leave part B. Use the first rule below that applies:
- If all implementation tasks and all requirements have the state `pass` or
  `deferred`, then continue with the final check below.
- If the architecture or the plan is wrong, then go back to step 1.
- In all other cases, go back to part A.
```

### 2. A deferral does not stick. Blocker. Fixed.

The deferral path is: Part A cannot make a task pass, the agent reports and
asks, the user agrees to leave it. The user defers the requirement. Nothing
then told the agent to set that requirement's implementation tasks to
`deferred`, and **States** forbids it from doing so on its own: "You never set
a state to `deferred` on your own."

So the task stayed at `fail`. Step 0 rule 4 sees a state that is not `pass`
and not `deferred` and routes to step 2. Part A picks the task up again (it
only skips `pass` and `deferred`) and retries the work the user just agreed to
drop, up to the attempt budget, then asks again. The loop survives a session
reset, because the documents faithfully record it.

Two further leaks fed the same loop, both in Part B. Its automated-suite loop
set every covered requirement to `pass` or `fail` "as the report gives it",
with no check for `deferred`, so a deferred requirement with a test case still
in the suite was overwritten to `fail` on the next pass. And its failure
handling set *all* implementing tasks of a failed requirement to `fail`, which
un-deferred a deferred task.

Together these broke the promise in the README: "It never decides on its own
to skip a requirement: only you can defer one." The user could not make a
deferral stick either.

Fixed in three places:

- SKILL.md:107-115. **States** now says a deferral covers the work for the
  deferred item: the tasks that implement that requirement and no other
  live requirement are deferred with it, a task shared with a live
  requirement is left alone, and deferring a task prompts the agent to ask
  whether its requirements are deferred too. It is framed as carrying out the
  user's decision, not making one, so it does not contradict the rule above
  it.
- SKILL.md:396. The automated-suite loop now skips `deferred` requirements
  first, mirroring the manual-test loop that already did this.
- SKILL.md:429-432. Failure handling now keeps a `deferred` task as it is, and
  reports to the user when every implementing task for a failed requirement is
  deferred, since the agent then has no way to correct it.

With these in place, the "all `pass` or `deferred`" exit added by fix 1 is
actually reachable. The two fixes compose.

### 3. Step 0 auto-repair can jump over step 1. Significant. Fixed.

The consistency check requires every requirement to have a task, and repaired
an obvious failure by adding "a new task with state `planned`". The
empty-table case was excluded, but the partial case was not.

Interrupt step 1 after five requirements and three tasks. The next session
repairs by inventing two stub tasks, which means rule 2 ("if the
implementation tasks table is empty, go to step 1") no longer fires, rule 4
fires, and the session enters step 2 and starts building from stubs that no
one designed. The repair hid the fact that planning was unfinished, and the
worst case is silent: the agent builds the wrong thing confidently.

Fixed in two places:

- SKILL.md:244-248. A requirement without an implementation task is now named
  as what it is, an unfinished plan rather than a damaged table, and routed to
  step 1. The reason is stated, so an agent does not reintroduce the repair
  out of helpfulness: "A task that you invent here is a task that nobody
  designed."
- SKILL.md:238-242. The repair example was the defect itself, so it is
  replaced with one that is genuinely obvious and safe: a `Next ID` line whose
  number is not higher than every ID in its table is set to the highest ID
  plus one.

The exclusion in the check at SKILL.md:233 is now gone. It was a special case
for the empty table only, and the new rule covers the empty and the partial
case the same way. That is two lines shorter and one rule simpler.

Rule 2 in **Find the current step** is now strictly redundant, since the
consistency check routes to step 1 before the rules are read. It is left in
place: one line of defensive redundancy in a routing table is cheap, and it
still holds if the check is ever skipped.

### 4. Nothing creates `solution/README.md`. Significant. Fixed.

The handoff README is listed in the file overview (SKILL.md:47), is required
by **Handoff**, and was checked once, at the final check (SKILL.md:468). No
step created it, and step 1 does not require a task for it. On a first run it
was absent until the last moment of the last step, which is the worst time to
write install and run instructions from memory.

Fixed in two places:

- SKILL.md:354-355. Part A now has a per-task bullet: if the task changes the
  way to install, run or test the solution, create or update
  `solution/README.md`. This fires naturally on the first task that makes the
  solution runnable, and keeps the file current after that.
- SKILL.md:165-168. **Handoff** now says the file is created in step 2, as
  soon as the solution can be installed or run, and that the final check only
  verifies it.

I considered the other option in the original writeup, a dedicated
implementation task for the README in step 1, and rejected it. Such a task has
no requirement to put in its Requirements column, so it would be the one task
in the plan with an empty column, and the consistency checks would have to
learn about the exception. The per-task bullet needs no new structure.

### 5. "A test case for each requirement" contradicts manual tests. Minor.

SKILL.md:125-126 says to give each requirement a test case in the suite.
SKILL.md:131 says to use a manual test when a command cannot do the test, and
Part B (SKILL.md:403) works with "each requirement that the suite does not
cover". The strict reading of the first rule also collides with the count
check: a manual requirement has no test case, so the expected number of test
cases in the test method must exclude it.

The intent is clear and Part B's loop is correctly scoped, so this misleads
rather than breaks. Fix by narrowing the first rule to "each requirement that
a command can test".

### 6. The attempt budget is loose and expensive. Minor.

"Reasonable attempts (say 10 variations of trying things out)" appears at
SKILL.md:366-368 for a single task and again at SKILL.md:455-457 for the whole
verification cycle. Ten does not mean the same thing in the two places, and in
the second it can mean ten full suite runs plus ten rounds of correction
before the user hears anything. Consider a smaller number for the cycle, or
state the budget as "attempts at this task" versus "cycles through part A and
part B".

### 7. Autonomy versus a thin brief. Minor, worth a sentence.

SKILL.md:195 says "you keep working until you get to step 3", and step 1
authorizes proceeding once there is "enough to build at least something
basic" (SKILL.md:277-278). Together these let a two-line brief turn into a
built, tested application before the user sees a requirement. The distilled
requirements table is the natural checkpoint. Consider showing it to the user
before leaving step 1 on a first run.


## Minor notes

- **Template path.** SKILL.md:206-209 says to copy from "the `templates/`
  directory (in this skill's directory)". "Next to this SKILL.md" is harder to
  get wrong.
- **`.gitignore`.** It lists `docs/`, `solution/`, `solution.json` and
  `architect.json`, but not `.architect/`. The first and last two look like
  leftovers from earlier names. If you dogfood architect in this repo,
  `.architect/` gets committed.
- **Length.** 24 KB, roughly 6k tokens, loaded on every invocation of a skill
  that is invoked repeatedly. Justifiable, since it is the whole protocol, but
  **Identifiers** (14 lines) could shrink to the rule plus one line of reason,
  and the state lists in **States** already defer to the templates and could
  stop restating the names.
- **No git guidance, deliberately.** Worth keeping that way. Commit decisions
  stay with the user.


## Summary

| # | Defect | Severity | Status |
| --- | --- | --- | --- |
| 1 | Part B has no exit to the final check | Blocker | Fixed |
| 2 | Deferral does not stick | Blocker | Fixed |
| 3 | Step 0 auto-repair jumps over step 1 | Significant | Fixed |
| 4 | Nothing creates `solution/README.md` | Significant | Fixed |
| 5 | Test case per requirement contradicts manual tests | Minor | Open |
| 6 | Attempt budget is loose | Minor | Open |
| 7 | Autonomy versus a thin brief | Minor | Open |

With 1 and 2 fixed, the workflow terminates, and stops when told to. With 3
and 4 fixed, it does not build from a plan that was never written, and it
hands over a solution the user can actually run. What is left is wording.

All four fixes are text only, in `SKILL.md`. No template changed, and no state
written by an earlier run becomes invalid. An existing `.architect/` directory
keeps working. The file grew by 27 lines net, from 504 to 531.

What is not yet known is how the workflow behaves over a long project. Every
defect above was found by reading, not by running. Reading finds contradictions
and dead ends. It does not find the places where the instructions are clear,
followed, and still produce the wrong result. That needs a real project.
