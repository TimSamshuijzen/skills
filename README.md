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

This is skill is copied from Blagoy Simandoff's 
"asd-ste100-writer-skill" at 
https://github.com/blagoySimandov/asd-ste100-writer-skill/tree/main ,
and made more compact and less strict.


## architect

Warning: Under construction. Do not use.

Let your agent act as the architect of your solution: it converts your idea 
to requirements, designs the architecture, writes an implementation plan, 
builds and tests the solution, until the solution meets all the requirements.

Architect stores its state in its documents. You can reset the session at any 
time, architect reads the documents and picks up from where it left off.

You can add or change requirements, such as new features, by submitting
change requests. Architect will process the change requests, adjust the 
requirements, and work until the solution meets all requirements.


### How to use

1. Create a new empty project directory.
2. Copy `skills/architect/` into your project's skills directory (in Claude 
   Code, put it in `.claude/skills/architect/`.).
3. Start an agent (e.g. Claude Code) session in this directory and address it 
   as "architect". For example: *"Architect, let's build a solution."*, or 
   *"Architect, continue your work."*, or 
   *"Architect, add feature X."*.

When invoked, architect will create a `.architect/` directory in the current 
working directory, with these files:

```
.architect/
  requirements.md         Solution name, description and requirements table
  architecture.md         Architecture of the solution
  implementation-plan.md  Implementation tasks table
  test-method.md          Method for testing and verifying the solution
  solution/               The solution that is built
```

Architect writes no files outside the `.architect/` directory. There is no 
separate state file: the states in the requirements table and in the 
implementation tasks table tell architect what is done and what is not done.

The default technology preference of architect is: Node.js for backend, single 
page HTML with vanilla JavaScript for frontend. Tell the architect the 
preferred technology to change this. Alternatively, add the skills of the 
development team to your project.
