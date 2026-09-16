# Verdict: `skills/architect`

Reviewed: 2026-09-16, against `skills/architect/SKILL.md` at commit 340e2f7
(531 lines) and the four files in `skills/architect/templates/`.

**Findings 1, 2 and 3 were fixed on 2026-09-16.** Line numbers below refer to
the reviewed version, not to the current file. Findings 4 to 7 are open.

**Verdict: sound design, ship it after two fixes.** The state machine is
coherent, the state model is genuinely well thought out, and the anti-cheating
rules around testing are stronger than in most workflow skills. Two routing and
bookkeeping holes will bite on real projects. Both are a few lines of text to
close.


## What is good

These are not generic compliments. Each one closes a failure mode that agent
workflows usually get wrong.

- **State lives in the documents, with no separate state file.** The three
  carriers (requirement states, task states plus the `Changed` column, and the
  final check record) are each load-bearing, and the skill says why: the
  documents and the state cannot disagree. Session reset is a real recovery
  path, not a claim.
- **`Next ID` counters instead of "highest ID plus one".** The rationale at
  lines 84-89 is correct and non-obvious: a reused ID makes a new requirement
  silently inherit the old requirement's test case.
- **"A test that did not run is not a pass"** (lines 140-145) and **"a run that
  reports fewer test cases than the test method says is a failed run"**. These
  two close the most common ways an agent reports green without evidence.
- **`deferred` is reserved to the user**, and deferred items are reported at
  every step 3. This blocks silent scope reduction, which is the usual way a
  long autonomous run "finishes".
- **The `Changed` column externalises working memory.** Part B needs to know
  which manual tests to repeat, and the skill states outright that this list is
  not kept in the agent's head. Correct for a resettable session.
- **The final check exists because the `Changed` heuristic is incomplete**
  (lines 462-466). The author saw that a manual test can break from a task that
  does not list that requirement, and added a cheap once-at-the-end sweep rather
  than an expensive per-cycle one. That is a real insight, correctly costed.
- **Part B forbids correcting the solution without an implementation task for
  the correction** (lines 434-437). This is what keeps the plan from drifting
  behind the code.
- **The consistency check refuses to guess.** "If the correct repair is not
  obvious, then do not guess and do not continue."
- **The README is written in step 2, not at the end** (lines 165-168).


## Findings

### 1. High - A change request on a fresh project skips step 1 entirely

**Status: fixed.** A guard was added at the top of **Change requests**.

Both routing rules put the change-request branch *before* the step rules:
line 176 ("do step 0 first, and then go to section **Change requests**. Do this
whatever the current step is") and line 253. The rule that would catch an empty
project, `- If the requirements table is empty, then go to step 1`, is at
line 257, inside the block that is only reached "if not".

"Architect, build me a todo app with tags" on an empty directory reads as a
request for an addition to the requirements. Routed to **Change requests**
(lines 500-531), the agent distils requirements, adjusts the architecture and
plan, and lands in step 2. It never fills the **Solution** section (only step 1
does that, line 282), never holds the requirement-gathering conversation, and
never creates the test method. Part B then says "run the full automated test
suite. This is one command (see `.architect/test-method.md`)" against an
untouched template.

The next session self-heals, because step 0 sees the test method is still the
empty template. The current one does not.

**Fix:** open the **Change requests** section with a guard, e.g. "If the
requirements table is empty, then this is not a change request. Go to step 1."


### 2. High - The expected test-case count has no maintenance rule

**Status: fixed.** The maintenance duty was stated in **Rules for testing**,
next to the check that depends on it, and reinforced at the three places where
the suite changes: step 1, step 2 part A, and the removal path in **Change
requests**. The absolute count was kept rather than replaced.

`templates/test-method.md:33-35` asks for "the number of test cases that a full
run must report". SKILL.md enforces it twice: line 144 and line 391, where a run
reporting fewer cases than that number is a failed run that must be diagnosed
before any result is recorded.

Nothing anywhere tells the agent to update that number. Step 1 covers it only
implicitly ("create or update these documents"). The **Change requests** section
enumerates precise edits, including "remove its test case from the test suite",
and omits the count.

So: remove a requirement via a change request, and every subsequent full run
reports one case fewer than the test method demands. Part B classifies each of
them as a failed run and sends the agent to "find the cause and correct it
first". The cause is the stale number, which the agent has no instruction
pointing at.

**Fix:** add to **Change requests**, and to step 1, "update the number of test
cases in `.architect/test-method.md`". Alternatively drop the absolute count in
favour of "the report must give a result for every requirement that is not
deferred", which is self-maintaining.


### 3. Medium - "Requirement without a task" is argued but not encoded

**Status: fixed.** The rule was added to the ordered list, above the step 2
rules. The prose at lines 244-248 said "the rules below would then send you to
step 2", which the new rule makes false, so that sentence was corrected too.

The rule needed the qualifier "that is not `deferred`". Without it, a
requirement the user deferred before any task existed for it would send a
resumed session to step 1, which would plan a `planned` task for it, which part
A would then build - carrying out work the user had deferred. Every other
deferred rule in the skill carries this exclusion. The consistency check item,
the step 1 instruction and `templates/implementation-plan.md` were qualified to
match.

Lines 244-248 are right, and the reasoning is explicit: do not invent a task
during the consistency check, because "the rules below would then send you to
step 2 to build it. Go to step 1 and plan it."

But the ordered rule list at lines 256-265 is what actually decides the step,
and it has no rule for this case. An untasked requirement sits at `defined`,
which is not `pass` and not `deferred`, so the fourth rule fires and sends the
agent to step 2 anyway. It recovers eventually, via Part B failing the
requirement and adding a task, but that is the expensive path the paragraph was
written to avoid.

**Fix:** add to the ordered list, above the step 2 rules: "If a requirement has
no implementation task, then go to step 1."


### 4. Medium - Coarse requirements plus one test case each makes `pass` weak

Line 279 tells step 1 to keep requirements "as high level as possible, to
cluster requirements where we can, in order to limit the number of rows".
Line 125 tells it to "give each requirement a test case in the test suite".

Pulling in both directions produces one test case standing in for a cluster of
behaviour. The skill's core promise is that work is only done when a test says
so, and that promise is exactly as strong as this mapping. Nothing forbids the
test case for R1 being a group of cases under that ID, but nothing says it
either, and the acceptance criteria are the stated arbiter.

A second, smaller cost: failure granularity follows requirement granularity.
One broken behaviour inside a five-behaviour R3 fails R3, fails every task that
implements R3, and sends all of them back through Part A.

**Fix:** one sentence in **Rules for testing**: "The test case for a requirement
may be a group of test cases under that ID. Together they must cover every
acceptance criterion of the requirement."


### 5. Medium - Change requests never touch the test method

The section resets the final check (line 515) and nothing else in
`test-method.md`. New requirements needing a manual test do not get added to the
**Manual tests** list; requirements removed do not get taken off it. Part A
recovers the test *cases* ("Write or update the test cases in the test suite for
the requirements that this task implements"), so the gap is confined to the
method document, but that document is the one Part B reads to decide what a
valid run looks like. Same fix location as finding 2.


### 6. Low - Line 168 reads as a directive, not a warning

> "You create `solution/README.md` in step 2 ... Do not leave it to the final
> check. At the final check you only verify it, and at that moment you must
> write the commands from memory."

The intent is clearly *"...because at that moment you would have to write the
commands from memory"* - a reason not to defer the work. As written, the last
clause is an imperative telling the agent to write commands from memory at the
final check, which is the opposite of what the paragraph wants.

**Fix:** "...because at the final check you would have to write the commands
from memory."


### 7. Low - Size, and what it costs

531 lines and about 4,450 words load on every invocation, including the ones
where the agent is only doing step 0 and a single task. The natural split is by
step: step 0 and the routing rules stay in `SKILL.md`, and the bodies of steps
1, 2 and 3 move to `references/`, loaded when that step is current.

This is a judgement call, not a defect. A state machine split across files risks
the agent acting on a step whose rules it did not read, and that failure is
worse than the token cost. If you split it, keep **States**, **Rules for
testing** and **Change requests** in `SKILL.md`, since all three are referenced
from more than one step.


### Minor

- The `templates/*.md` frontmatter is decorative. It is copied into
  `.architect/`, where nothing reads `name:` or `description:`. Harmless.
- The final check record asks for "the date" with no instruction on obtaining
  it. Agents usually have it; worth a word if you have seen it guess.


## Summary

Findings 1, 2 and 3 are fixed. Findings 4 to 7 are open and can wait for the
next pass. Finding 4 is the one that matters most of those, because it bears on
what `pass` actually certifies; findings 5, 6 and 7 are small.

The README's own status line - "new, revised, not yet proven over a long
project, read what it writes and check its work" - is accurate and worth
keeping until the skill has run a project end to end.
