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
- `mssp classify`: produce evidence-backed, review-required layer suggestions without promoting candidates.
- `mssp review-candidate`: record an explicit approve, reject, or defer decision and produce a blocked contract draft when approved.
- `mssp promote-candidate`: emit a completed module manifest only after independent final approval.
- `mssp drift`: compare canonical FMS records, module manifests, and bounded source ownership without mutating the project.
- `mssp graph`: generate a Mermaid or JSON architecture graph from the Intermediate Model.
- `mssp explain`: print a concise inventory for humans and agents.
- MSSP Diagnostic Protocol v0.2 envelopes for `lint --json` and `island --json`.
- Stable public `MSSP_*_NNN` diagnostic codes with v0.1 identifiers preserved as `legacyCode`.
- Portable source references, declared dependency/MSSP-VT relations, scanner evidence, classification evidence, promotion provenance, and structural drift evidence.
- GitHub Actions and PR review templates.
- A complete reference project in `examples/hello-mssp`.

The scanner does not assign MSSP layers. The classifier emits hypotheses, support, counterevidence, and unresolved questions while preserving `autoPromotion: false`. Review approval still does not equal promotion: every contract must be completed and independently approved. A clean drift report establishes structural consistency only, not semantic or runtime equivalence.

## Five-minute quick start

```bash
npm install
npm run build
node dist/cli.js init /tmp/my-mssp-project
node dist/cli.js lint /tmp/my-mssp-project
node dist/cli.js model /tmp/my-mssp-project --out /tmp/mssp-model.json
node dist/cli.js scan . --revision HEAD --out /tmp/repository-scan.json
node dist/cli.js classify . --revision HEAD --out /tmp/classification-suggestions.json
node dist/cli.js review-candidate . \
  --candidate candidate.repository \
  --decision defer \
  --reviewer architecture-reviewer \
  --rationale "The aggregate boundary needs a system-level decision." \
  --out /tmp/promotion-review.json
node dist/cli.js drift /tmp/my-mssp-project --revision HEAD --out /tmp/architecture-drift.json
node dist/cli.js island /tmp/my-mssp-project
node dist/cli.js graph /tmp/my-mssp-project --format mermaid --out /tmp/architecture.mmd
```

During repository development:

```bash
npm run mssp -- lint examples/hello-mssp
npm run mssp -- model examples/hello-mssp --revision HEAD
npm run mssp -- scan . --revision HEAD --max-files 10000
npm run mssp -- classify . --revision HEAD --max-files 10000
npm run mssp -- drift examples/hello-mssp --revision HEAD --max-files 10000
npm run mssp -- explain examples/hello-mssp
npm run mssp -- island examples/hello-mssp
npm run mssp -- graph examples/hello-mssp --format mermaid
```

The JSON diagnostic commands emit the [MSSP Diagnostic Protocol v0.2](spec/MSSP-DIAGNOSTIC-PROTOCOL-v0.2.md). Consumers should use `diagnostics[].code`; transitional v0.1 identifiers remain in `diagnostics[].legacyCode`.

The `model` and `scan` commands emit the [MSSP Intermediate Model v0.2](spec/MSSP-INTERMEDIATE-MODEL-v0.2.md), the common exchange representation for manifests, scanners, adapters, IDEs, agents, graphs, and future impact analysis.

The `classify` command emits the independent [MSSP Classification Suggestions v0.2](spec/MSSP-CLASSIFICATION-SUGGESTIONS-v0.2.md) report. Candidate review and manifest emission follow the [MSSP Candidate Review and Promotion Protocol v0.2](spec/MSSP-CANDIDATE-PROMOTION-v0.2.md). Structural consistency reports follow [MSSP Architecture Drift Report v0.2](spec/MSSP-ARCHITECTURE-DRIFT-v0.2.md).

## Repository Scanner v0.2

```text
Repository
    ↓ deterministic bounded inventory
Markers / .gitignore / workspaces / generated-source conventions
    ↓ static dependency evidence
Unclassified candidates
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

A candidate records repository-relative path, boundary kind and confidence, file counts, observed languages, source references, evidence, and `status: unclassified`.

`boundaryConfidence` means “this path is probably a structural boundary.” It does not mean “this path is probably TMS.” A scan that reaches the default 50,000-file bound sets `discovery.truncated` to `true` and MUST NOT be treated as complete.

Full scanner specification: [`spec/MSSP-REPOSITORY-SCANNER-v0.2.md`](spec/MSSP-REPOSITORY-SCANNER-v0.2.md).

## Classification Suggestions v0.2

```text
Unclassified candidate
    ↓ deterministic advisory rules
Suggested layer + support + counterevidence + unresolved questions
```

The classifier may suggest `FMS`, `SCL`, `SMS`, `TMS`, `DMS`, `ROUTER`, `RUNTIME`, or `UNDETERMINED`.

It uses inspectable signals from names, paths, package/workspace boundaries, and static candidate-dependency topology. It does not execute repository code or call an AI model.

Every suggestion preserves:

```json
{
  "status": "review-required",
  "confidence": "low | medium | high",
  "supportScore": 0.0,
  "alternativeLayers": [],
  "supportingEvidence": [],
  "counterEvidence": [],
  "unresolvedQuestions": []
}
```

`supportScore` is heuristic support, not probability. A truncated scan forces all suggestions to low confidence. Repository and source-root aggregate boundaries remain `UNDETERMINED`.

Full specification: [`spec/MSSP-CLASSIFICATION-SUGGESTIONS-v0.2.md`](spec/MSSP-CLASSIFICATION-SUGGESTIONS-v0.2.md).

## Candidate review and promotion v0.2

```text
Candidate
  → classification suggestion
  → explicit reviewer decision
  → blocked contract draft
  → contract completion
  → independent final approval
  → module manifest emission
```

Create a review record:

```bash
node dist/cli.js review-candidate . \
  --candidate packages/exporter \
  --decision approve \
  --layer TMS \
  --reviewer architecture-reviewer \
  --rationale "The capability is optional and independently activated." \
  --out exporter-review.json
```

An approved review creates a deliberately incomplete `contractDraft`. It remains blocked while any `TODO`, unresolved review condition, truncated scan, missing maintainer, missing executable entry, missing TMS activation rule, missing failure mode, missing validation criterion, or missing representative test remains.

After completing the contract, a different actor may emit the manifest:

```bash
node dist/cli.js promote-candidate exporter-review.json \
  --approver release-approver \
  --approval-rationale "Contract, permissions, failure behavior, validation, and tests are complete." \
  --out TMS/exporter/module.yaml
```

The promotion command recomputes blockers, validates `module.schema.json`, records provenance in `metadata.promotion`, and refuses to overwrite an existing file. It does not modify `mssp.yaml`, register the module automatically, create runtime relations, or execute candidate code.

```text
Suggestion ≠ Review decision
Review approval ≠ Completed contract
Completed contract ≠ Final approval
Manifest emission ≠ Project registration
```

Traditional Chinese guide: [`docs/candidate-promotion.zh-TW.md`](docs/candidate-promotion.zh-TW.md).

## Architecture drift report v0.2

```text
Canonical FMS records
        ↕
Module manifests
        ↕
Configured layer source ownership
```

Run:

```bash
node dist/cli.js drift examples/hello-mssp \
  --revision HEAD \
  --max-files 10000 \
  --out architecture-drift.json
```

The report checks canonical FMS document presence, parses the `ID` and `Layer` table in `FMS/01_MODULE_INDEX.md`, compares it with declared manifests, and checks whether executable source is covered by exactly one module boundary.

Every report preserves:

```json
{
  "analysis": {
    "mode": "static-conservative",
    "semanticEquivalence": false,
    "autoMutation": false
  }
}
```

Findings distinguish positive `drift` from `indeterminate` evidence. Truncated inventories and prose-only module indexes cannot be treated as proof of consistency. The analyzer does not repair files, register modules, infer semantic equivalence, or create runtime relations.

Traditional Chinese guide: [`docs/architecture-drift.zh-TW.md`](docs/architecture-drift.zh-TW.md).

## Adopt MSSP in an existing repository

1. Run `mssp scan` to create a structural and dependency evidence inventory.
2. Run `mssp classify` to produce reviewable hypotheses, not declarations.
3. Review support, counterevidence, alternatives, and unresolved questions.
4. Record candidate decisions with `mssp review-candidate`.
5. Complete approved contract drafts and obtain independent final approval before `mssp promote-candidate`.
6. Register emitted manifests in `mssp.yaml` through an ordinary architecture change.
7. Create and maintain FMS system narrative, module index, and architecture notes.
8. Run `mssp drift` after architecture changes and resolve drift or indeterminate evidence.
9. Add SCL change contracts and DMS diagnostic contracts.
10. Run `mssp lint` and `mssp island` in CI.
11. Update MSSP-VT impact relations whenever compatibility changes.

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

The model distinguishes approved `modules` from unclassified `candidates`, and normative `relations` from scanner-derived `discovery.dependencies`.

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

## Repository map

```text
schemas/                 Normative schemas for manifests, diagnostics, models, classification, promotion, and drift
src/                     TypeScript core, scanner, classifier, promotion, drift analysis, evidence helpers, and CLI
examples/hello-mssp/     Complete reference adoption
spec/                    Method and interoperability specifications
docs/                    Adoption and protocol guides, EML integration, whitepaper, roadmap
.github/                  CI and architecture-review workflow
```

## Status

`v0.1.0` is the architecture-contract MVP. v0.2 repository intelligence is in progress. Diagnostic Protocol, Intermediate Model, Repository Scanner foundation, `.gitignore` evidence, workspace discovery, static dependency scopes, generated-source filtering, evidence-backed classification suggestions, governed candidate review/promotion, and conservative FMS/code drift analysis are implemented. Tree-sitter/compiler-grade dependency resolution and Git diff impact inference remain open.

## License

Apache-2.0. Copyright 2026 Neo.K / EVEMISSLAB.
