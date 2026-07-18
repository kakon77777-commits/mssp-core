# EML Integration Boundary

MSSP Core is language-independent. EML is the first-class semantic and executable-language integration.

## Dependency direction

```text
@mssp/core
    ↑
@eml/mssp-adapter
    ↑
EML CLI / LSP / Studio / MCP
```

`@mssp/core` must not import EML AST, parser, emitter, runtime, or UI packages.

## Proposed adapter responsibilities

- Convert EML declarations and annotations into module manifests.
- Map EML semantic dependencies into MSSP `requires.modules`.
- Map PHOSPHOR/EML trace events into DMS observations.
- Surface MSSP diagnostics through EML CLI, LSP, Studio, and MCP.
- Preserve EML source spans for architecture navigation.
- Never silently classify ambiguous modules; emit suggestions with evidence.

## Proposed EML commands

```text
eml mssp infer <project>
eml mssp validate <project>
eml mssp graph <project>
eml mssp explain <module>
```

The adapter may propose FMS/SMS/TMS classifications, but a deterministic validator remains the final gate.
