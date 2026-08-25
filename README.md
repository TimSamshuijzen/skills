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

Architect stores state. You can reset the session at any time, architect 
will pick up from where it left off.

You can add or change requirements, such as new features, by submitting
change requests. Architect will process the change requests, adjust the 
requirements, and work until the solution meets all requirements.

Architect stores state. You can reset the session at any time. Architect 
will pick up from where it left off, with a fresh context window.


### How to use

1. Create a new empty project directory.
2. Copy `skills/architect/` into your project's skills directory (in Claude 
   Code, put it in `.claude/skills/architect/`.).
3. Start an agent (e.g. Claude Code) session in this directory and address it 
   as "architect". For example: *"Architect, let's build a solution."*, or 
   *"Architect, continue your work."*, or 
   *"Architect, add feature X."*.

When invoked, architect will create these files in the current working 
directory:

```
solution.json           Solution name and description
architect.json          Current workflow step
docs/requirements.md    Requirements table
docs/architecture.md    Architecture of the solution
docs/implementation-plan.md  Implementation tasks table
docs/test-method.md     Method for testing and verifying the solution
solution/               The solution that is built
```

The default technology preference of architect is: Node.js for backend, single 
page HTML with vanilla JavaScript for frontend. Tell the architect the 
preferred technology to change this. Alternatively, add the skills of the 
development team to your project.
