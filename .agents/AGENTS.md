# Workspace Rules

to save AI token:

1. Small modules
2. Pure domain rules
3. Explicit dependency direction
4. Strong boundaries
5. Local tests

## Code Comments

- Always write concise, clear code comments why in English.
- no auto generate jsDoc comments

## Code Formatting (imported from VS Code settings)

- Use Prettier for formatting.
- `printWidth`: 120
- `tabWidth`: 2
- `bracketSpacing`: true
- `semi`: true
- `useTabs`: false
- `trailingComma`: "es5"
- `bracketSameLine`: true
- `singleAttributePerLine`: false

## Context Constraints

- Always exclude `__test__` and `node_modules` directories from workspace searches (like grep) and general context analysis unless explicitly asked by the user.
