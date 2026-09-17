# skills

Skills for agents. 

Each sub-directory in the `skills` directory is a skill.

- `skills/keeping-it-simple/`
- `skills/asd-ste100/`
- `skills/architect/`

Copy these skills to your own project where needed.


## keeping-it-simple

Tell your agent to keep it simple.


## asd-ste100

Tell your agent to write in ASD-STE100. 

This skill is copied from Blagoy Simandoff's 
"asd-ste100-writer-skill" at 
https://github.com/blagoySimandov/asd-ste100-writer-skill/tree/main ,
altered to be more compact and less strict.


## architect

Let your agent be the architect of your solution: it converts your idea 
to requirements, designs the architecture, writes an implementation plan, 
builds and tests the solution, until the solution meets all the requirements.

Architect stores its state in its documents. You can reset the session at any 
time, architect reads the documents and picks up from where it left off.

You can add or change requirements, such as new features, by submitting
change requests. Architect will process the change requests, adjust the 
requirements, and work until the solution meets all requirements.

Architect only marks work as done when a test says so. When it cannot get 
something to pass, it stops and asks you. It never decides on its own to skip 
a requirement: only you can defer one, and architect reports the deferred 
items each time it is done.


### How to use

1. Create a new empty project directory.
2. Copy `skills/architect/` into your project's skills directory (in Claude 
   Code, put it in `.claude/skills/architect/`).
3. Start an agent (e.g. Claude Code) session in this directory and address it 
   as "architect". For example: *"architect, let's build a solution"*, or 
   *"architect, add feature X"*, or *"architect, continue your work"*.

When invoked, architect will create two directories in the current working 
directory:

```
.architect/               Architect's own documents
  requirements.md         Solution name, description and requirements
  architecture.md         Architecture of the solution
  implementation-plan.md  Implementation tasks
  test-method.md          Method for testing and verifying the solution
solution/                 The solution that is built, with its README
```

The solution is the deliverable, so it is kept out of `.architect/`, where you 
and your tools can find it. Architect writes no files outside these two 
directories.

There is no separate state file. Three things in the documents tell architect 
what is done and what is not done: the states in the requirements table, the 
states and the `Changed` column in the implementation tasks table, and the 
final check record in the test method.

The default technology preference of architect is: Node.js for backend, single 
page HTML with modern vanilla JavaScript for frontend. Tell the architect the 
preferred technology to change this. Alternatively, add the skills of the 
development team to your project.
