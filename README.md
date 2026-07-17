# MSSP Core MVP

[繁體中文](README.zh-TW.md)

**MSSP (Mother-Set and Subset Paradigm)** is a language-agnostic method for making a complex system understandable, navigable, testable, governable, and evolvable.

MSSP is not another application framework and not a folder-naming convention. It defines a system's identity, stable core, optional subsets, change boundaries, diagnostics, routing, runtime relationships, and version impact as machine-readable architecture contracts.

## The core model

```text
MSSP = (FMS, SCL, SMS, TMS, DMS, Router, Runtime)
```

| Layer | Question it answers | MVP invariant |
|---|---|---|
| FMS | What is this system? | Pure metadata; zero executable source |
| SCL | How may the system be changed? | Machine-readable change and permission contracts |
| SMS | What must always remain stable? | Never depends on optional TMS modules |
| TMS | What can be loaded, replaced, or removed? | Depends only on declared SMS capabilities; island-testable |
| DMS | How is execution observed and explained? | Produces diagnostics without owning business state |
| Router | Which optional subset should be activated? | Selects by contracts; does not turn TMS into core dependencies |
| Runtime | How is the selected plan executed? | Executes only declared modules and emits observable evidence |

MSSP-VT is represented in every module manifest through `version`, `compatibility`, and `changeImpact`.

## MVP capabilities

- `mssp init`: scaffold an adoption-ready MSSP project.
- `mssp lint`: validate YAML schemas, layer placement, dependency direction, FMS purity, cycles, entries, and MSSP-VT references.
- `mssp island`: enforce the TMS island-test rule.
- `mssp graph`: generate a Mermaid or JSON architecture graph.
- `mssp explain`: print a concise inventory for humans and agents.
- GitHub Actions and PR review templates.
- A complete reference project in `examples/hello-mssp`.

This MVP deliberately does **not** yet include AI auto-classification, a visual web editor, runtime instrumentation, AISMBI memory-bound inference, or an EML adapter implementation. Their interfaces are reserved in the roadmap.

## Five-minute quick start

```bash
npm install
npm run build
node dist/cli.js init /tmp/my-mssp-project
node dist/cli.js lint /tmp/my-mssp-project
node dist/cli.js island /tmp/my-mssp-project
node dist/cli.js graph /tmp/my-mssp-project --format mermaid --out /tmp/architecture.mmd
```

During repository development:

```bash
npm run mssp -- lint examples/hello-mssp
npm run mssp -- explain examples/hello-mssp
npm run mssp -- island examples/hello-mssp
npm run mssp -- graph examples/hello-mssp --format mermaid
```

## Adopt MSSP in an existing repository

1. Add `mssp.yaml` at the repository root.
2. Create `FMS/00_SYSTEM_NARRATIVE.md`, `FMS/01_MODULE_INDEX.md`, and `FMS/02_ARCHITECTURE_NOTES.md`.
3. Declare stable capabilities as SMS manifests.
4. Declare optional capabilities as TMS manifests with activation, permissions, failure modes, validation, and representative tests.
5. Add SCL change contracts and DMS diagnostic contracts.
6. Run `mssp lint` and `mssp island` in CI.
7. Require an FMS review whenever a pull request changes system identity, module boundaries, or dependency direction.
8. Update MSSP-VT impact relations whenever compatibility changes.

## Module contract

```yaml
schemaVersion: "0.1"
id: plugin.export-pdf
name: PDF Export
version: "0.1.0"
layer: TMS
purpose: Export validated documents as PDF.
entry: index.ts
activateWhen:
  - request.output == pdf
inputs: [validated-document]
outputs: [pdf-file]
requires:
  modules: [core.document-model]
  tools: []
  data: []
permissions:
  may: [read-document, write-output]
  mayNot: [network, overwrite-source]
riskLevel: L1
failureModes: [invalid-document, output-write-failure]
validation:
  - output file exists
  - source document is unchanged
tests:
  - exports a minimal document
  - rejects malformed input safely
compatibility:
  mssp: ">=0.1 <0.2"
  modules:
    core.document-model: ">=1 <2"
changeImpact:
  affects: []
  affectedBy: [core.document-model]
maintainer: example-team
```

## Island-test rule

A TMS passes the MVP island test when it can be understood and loaded with:

```text
minimal Runtime + declared SMS dependencies + mocked external tools
```

A TMS must not directly require another TMS. Coordination belongs in Router, Runtime, or a promoted stable SMS contract—not in hidden plugin coupling.

## Relationship to EML

MSSP and EML cooperate but do not replace one another:

```text
MSSP = architecture organization, capability placement, subset governance
EML  = semantic expression, compression, executable language tooling
```

The future `@eml/mssp-adapter` should translate EML AST and trace data into MSSP manifests and diagnostics. `@mssp/core` must remain independent from EML.

The package name is reserved for publication; before npm publication, run the repository-local `node dist/cli.js` commands shown above.

## Repository map

```text
schemas/                 Normative machine-readable schemas
src/                     TypeScript core and CLI
examples/hello-mssp/     Complete reference adoption
spec/                    Method and conformance specification
docs/                    Adoption, EML integration, and roadmap
.github/                  CI and architecture-review workflow
```

## Status

`v0.1.0` is an MVP and a public starting point. It establishes testable boundaries, not a claim that every MSSP research module is complete.

## License

Apache-2.0. Copyright 2026 Neo.K / EVEMISSLAB.
