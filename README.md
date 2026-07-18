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

## MVP and v0.2 groundwork

- `mssp init`: scaffold an adoption-ready MSSP project.
- `mssp lint`: validate schemas, layer placement, dependency direction, FMS purity, cycles, entries, and MSSP-VT references.
- `mssp island`: enforce the TMS island-test rule.
- `mssp model`: export the deterministic, language-neutral MSSP Intermediate Model from manifests.
- `mssp scan`: scan an existing repository and emit evidence-backed, unclassified structural candidates.
- `mssp graph`: generate a Mermaid or JSON architecture graph from the Intermediate Model.
- `mssp explain`: print a concise inventory for humans and agents.
- MSSP Diagnostic Protocol v0.2 envelopes for `lint --json` and `island --json`.
- Stable public `MSSP_*_NNN` diagnostic codes with v0.1 identifiers preserved as `legacyCode`.
- Portable source references, declared dependency/MSSP-VT relations, and scanner evidence records.
- GitHub Actions and PR review templates.
- A complete reference project in `examples/hello-mssp`.

The scanner deliberately does **not** auto-classify candidates as SMS or TMS. It discovers structural and dependency evidence first and leaves architecture classification to a later governed review step.

## Five-minute quick start

```bash
npm install
npm run build
node dist/cli.js init /tmp/my-mssp-project
node dist/cli.js lint /tmp/my-mssp-project
node dist/cli.js lint /tmp/my-mssp-project --json
node dist/cli.js model /tmp/my-mssp-project --out /tmp/mssp-model.json
node dist/cli.js scan . --revision HEAD --out /tmp/repository-scan.json
node dist/cli.js island /tmp/my-mssp-project
node dist/cli.js graph /tmp/my-mssp-project --format mermaid --out /tmp/architecture.mmd
```

During repository development:

```bash
npm run mssp -- lint examples/hello-mssp
npm run mssp -- lint examples/hello-mssp --json
npm run mssp -- model examples/hello-mssp --revision HEAD
npm run mssp -- scan . --revision HEAD --max-files 10000
npm run mssp -- explain examples/hello-mssp
npm run mssp -- island examples/hello-mssp
npm run mssp -- graph examples/hello-mssp --format mermaid
```

The JSON diagnostic commands emit the [MSSP Diagnostic Protocol v0.2](spec/MSSP-DIAGNOSTIC-PROTOCOL-v0.2.md). Consumers should use `diagnostics[].code`; transitional v0.1 identifiers remain in `diagnostics[].legacyCode`.

The `model` and `scan` commands emit the [MSSP Intermediate Model v0.2](spec/MSSP-INTERMEDIATE-MODEL-v0.2.md), the common exchange representation for manifests, scanners, adapters, IDEs, agents, graphs, and future impact analysis.

## Repository Scanner v0.2

```text
Repository
    ↓ deterministic bounded inventory
Markers / .gitignore / workspaces / generated-source conventions
    ↓ static dependency evidence
Unclassified candidates
    ↓ human or governed Agent review
Declared MSSP modules
```

The scanner currently provides:

- Node.js, Python, Rust, Go, Godot, JVM, and .NET project markers;
- conventional source-root and multi-module boundary candidates;
- root and nested `.gitignore` static evaluation;
- npm, pnpm, and Cargo workspace discovery;
- workspace-backed structural confidence;
- JavaScript/TypeScript, Python, Go, Rust, and GDScript static reference extraction;
- `internal`, `cross-boundary`, `workspace`, `external`, and `unresolved` dependency scopes;
- conservative generated-source recognition.

Static dependencies stay in `discovery.dependencies`. They are **not** promoted into `relations`, because a source import is evidence rather than an approved runtime architecture contract.

A candidate records:

- repository-relative path;
- boundary kind and structural confidence;
- file and source-file counts;
- observed languages;
- source references and evidence;
- `status: unclassified`.

`boundaryConfidence` means “this path is probably a structural boundary.” It does not mean “this path is probably TMS.”

The default scan bound is 50,000 files. A scan that reaches the bound sets `discovery.truncated` to `true` and MUST NOT be treated as complete.

Full scanner specification: [`spec/MSSP-REPOSITORY-SCANNER-v0.2.md`](spec/MSSP-REPOSITORY-SCANNER-v0.2.md).

## Adopt MSSP in an existing repository

1. Run `mssp scan` to create a structural and dependency evidence inventory.
2. Review candidates instead of accepting automatic layer assignments.
3. Add `mssp.yaml` at the repository root.
4. Create `FMS/00_SYSTEM_NARRATIVE.md`, `FMS/01_MODULE_INDEX.md`, and `FMS/02_ARCHITECTURE_NOTES.md`.
5. Declare stable capabilities as SMS manifests.
6. Declare optional capabilities as TMS manifests with activation, permissions, failure modes, validation, and representative tests.
7. Add SCL change contracts and DMS diagnostic contracts.
8. Run `mssp lint` and `mssp island` in CI.
9. Require an FMS review whenever a pull request changes system identity, module boundaries, or dependency direction.
10. Update MSSP-VT impact relations whenever compatibility changes.

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

## Intermediate Model boundary

```text
MSSP YAML / Repository Scanner / EML / Python / Rust / Godot
                              ↓
                  MSSP Intermediate Model
                              ↓
       Validator / Graph / IDE / Agent / Impact Analysis
```

The model distinguishes approved `modules` from unclassified `candidates`, and normative `relations` from scanner-derived `discovery.dependencies`. The reference output is deterministic, portable, and evidence-backed.

## Island-test rule

A TMS passes the MVP island test when it can be understood and loaded with:

```text
minimal Runtime + declared SMS dependencies + mocked external tools
```

A TMS must not directly require another TMS. Coordination belongs in Router, Runtime, or a promoted stable SMS contract—not in hidden plugin coupling.

## Relationship to EML

```text
MSSP = architecture organization, capability placement, subset governance
EML  = semantic expression, compression, executable language tooling
```

The future `@eml/mssp-adapter` should translate EML AST and trace data into the MSSP Intermediate Model and Diagnostic Protocol. MSSP Core must remain independent from EML.

The package name is reserved for publication; before npm publication, run the repository-local `node dist/cli.js` commands shown above.

## Repository map

```text
schemas/                 Normative schemas for manifests, diagnostics, and the Intermediate Model
src/                     TypeScript core, scanner, static evidence helpers, and CLI
examples/hello-mssp/     Complete reference adoption
spec/                    Method and interoperability specifications
docs/                    Adoption, protocol guides, EML integration, whitepaper, roadmap
.github/                  CI and architecture-review workflow
```

## Status

`v0.1.0` is the architecture-contract MVP. v0.2 repository intelligence is in progress. Diagnostic Protocol, Intermediate Model, Repository Scanner foundation, `.gitignore` evidence, workspace discovery, static dependency scopes, and generated-source filtering are implemented. Tree-sitter/compiler-grade dependency resolution, evidence-backed layer classification, candidate promotion, FMS/code drift analysis, and Git diff impact inference remain open.

## License

Apache-2.0. Copyright 2026 Neo.K / EVEMISSLAB.
