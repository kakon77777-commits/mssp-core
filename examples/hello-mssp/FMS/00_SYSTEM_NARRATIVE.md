# Hello MSSP — System Narrative

This example demonstrates a stable echo core, an optional uppercase transformation, diagnostics, routing, and runtime execution.

## Invariants

- FMS contains no executable code.
- `core.echo` is stable SMS.
- `plugin.uppercase` is optional TMS and depends only on SMS.
- Router selects the TMS by activation conditions.
- Runtime executes only declared modules.
