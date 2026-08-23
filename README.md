# skills

Skills for agents. 

Each sub-directory in the `skills` directory is a skill.

- `skills/keeping-it-simple/`
- `skills/asd-ste100/`
- `skills/architect/`

You can copy these skills to your own project.


## keeping-it-simple

Tell your agent to keep it simple.


## asd-ste100

Tell your agent to write in ASD-STE100. 

This is skill is a compact and less strict version of Blagoy Simandoff's 
"asd-ste100-writer-skill" at 
https://github.com/blagoySimandov/asd-ste100-writer-skill/tree/main


## architect

Let your agent act as the architect of a solution: it defines the requirements,
designs the architecture, writes an implementation plan, builds the solution,
and tests and verifies it against the requirements.

### How to use

1. Create a new empty project directory.
2. Copy `skills/architect/` into your project's skills directory.
3. Start your agent in the project empty directory and address it as
   "architect", for example: *"Architect, let's build a solution."*
4. Answer its questions about the solution name and the main requirements.
5. Say *"Architect, continue"* to let it proceed to the next step of its 
   workflow.

### Files

Architect will create these files in the current working directory.

```
solution.json           Solution name and description
architect.json          Current workflow step
docs/requirements.md    Requirements table (state: defined, pass, fail)
docs/architecture.md    Architecture of the solution
docs/implementation-plan.md  Implementation steps (state: planned, done)
docs/test-method.md     Method for testing and verifying the solution
solution/               The solution that is built
```

The state columns in the tables are the record of progress, and give
traceability from requirements to implementation steps.

### Notes

- Ask a question or make a request at any time. The architect pauses its
  workflow, answers, and continues when you tell it to continue.
- Default technology preference: Node.js for backend, single page HTML with
  vanilla JavaScript for frontend. Tell the architect the skills of your
  development team to change this.


