# MSSP Core MVP

[繁體中文](README.zh-TW.md)

**MSSP (Mother-Set and Subset Paradigm)** is a language-agnostic method for making a complex system understandable, navigable, testable, governable, and evolvable.

MSSP is not another application framework and not a folder-naming convention. It defines system identity, stable capabilities, optional subsets, change authority, diagnostics, routing, execution, compatibility, and change impact as machine-readable architecture contracts.

## Core model

```text
MSSP = (FMS, SCL, SMS, TMS, DMS, Router, Runtime)
```

| Layer | Question | Core invariant |
|---|---|---|
| FMS | What is this system? | Declarative identity and architecture records; no executable source. |
| SCL | How may the system change? | Machine-readable authority, approval, and prohibition contracts. |
| SMS | What must remain stable? | Never depends on optional TMS modules. |
| TMS | What may be loaded, replaced, or removed? | Depends only on declared SMS capabilities and remains island-testable. |
| DMS | How is execution observed and explained? | Produces evidence without owning business state. |
| Router | Which optional subset should activate? | Selects by contracts without turning TMS into core dependencies. |
| Runtime | How is an approved plan executed? | Executes declared modules and emits observable evidence. |

MSSP-VT is represented by each module's `version`, `compatibility`, and `changeImpact` declarations.

## Implemented commands

- `mssp init`: create an adoption-ready project skeleton.
- `mssp adapters`: list machine-readable adapter descriptors.
- `mssp adapt eml`: translate a versioned EML semantic export into the Intermediate Model.
- `mssp adapt python`: translate a versioned Python semantic export into the Intermediate Model; `py` is also accepted.
- `mssp lint`: validate schemas, layer placement, dependency direction, FMS purity, cycles, entries, and MSSP-VT references.
- `mssp island`: verify TMS island-test obligations.
- `mssp model`: export the deterministic, language-neutral Intermediate Model.
- `mssp scan`: discover repository structure and static dependency evidence without assigning MSSP layers.
- `mssp classify`: emit evidence-backed, review-required layer hypotheses without promotion.
- `mssp review-candidate`: record an explicit approve, reject, or defer decision.
- `mssp promote-candidate`: emit a completed module manifest after independent final approval.
- `mssp drift`: compare canonical FMS records, manifests, and bounded source ownership.
- `mssp impact`: map an explicit Git comparison to direct and transitive MSSP-VT review impact.
- `mssp viz`: generate a read-only Visualization Model or self-contained interactive HTML architecture view.
- `mssp graph`: generate Mermaid or JSON architecture graphs from the Intermediate Model.
- `mssp explain`: print a concise architecture inventory.

The scanner does not declare architecture. The classifier does not approve candidates. Review approval does not complete a contract. Manifest emission does not register a module. Drift and impact reports do not mutate or approve the architecture they describe. Visualization does not classify or promote what it displays. Adapters translate explicit exports; they do not execute source systems or auto-promote undeclared entities.

## Five-minute quick start

```bash
npm install
npm run build

node dist/cli.js adapters --json --out /tmp/adapter-descriptors.json
node dist/cli.js adapt eml examples/eml-adapter/semantic-export.json \
  --revision HEAD \
  --out /tmp/eml-intermediate-model.json
node dist/cli.js adapt python examples/python-adapter/semantic-export.json \
  --revision HEAD \
  --out /tmp/python-intermediate-model.json
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
node dist/cli.js drift /tmp/my-mssp-project \
  --revision HEAD \
  --out /tmp/architecture-drift.json
node dist/cli.js impact /tmp/my-mssp-project \
  --base origin/main \
  --head HEAD \
  --revision HEAD \
  --out /tmp/git-diff-impact.json
node dist/cli.js viz /tmp/my-mssp-project \
  --revision HEAD \
  --source-base https://github.com/OWNER/REPO/blob/BRANCH \
  --out /tmp/architecture.html
node dist/cli.js island /tmp/my-mssp-project
node dist/cli.js graph /tmp/my-mssp-project \
  --format mermaid \
  --out /tmp/architecture.mmd
```

During repository development:

```bash
npm run mssp -- adapters --json
npm run mssp -- adapt eml examples/eml-adapter/semantic-export.json --revision HEAD
npm run mssp -- adapt python examples/python-adapter/semantic-export.json --revision HEAD
npm run mssp -- lint examples/hello-mssp
npm run mssp -- model examples/hello-mssp --revision HEAD
npm run mssp -- scan . --revision HEAD --max-files 10000
npm run mssp -- classify . --revision HEAD --max-files 10000
npm run mssp -- drift examples/hello-mssp --revision HEAD --max-files 10000
npm run mssp -- impact examples/hello-mssp --base HEAD^1 --head HEAD --revision HEAD
npm run mssp -- viz examples/hello-mssp --format html --revision HEAD --out architecture.html
npm run mssp -- island examples/hello-mssp
npm run mssp -- graph examples/hello-mssp --format mermaid
```

## Interchange and governance protocols

- [MSSP Diagnostic Protocol v0.2](spec/MSSP-DIAGNOSTIC-PROTOCOL-v0.2.md)
- [MSSP Intermediate Model v0.2](spec/MSSP-INTERMEDIATE-MODEL-v0.2.md)
- [MSSP Repository Scanner v0.2](spec/MSSP-REPOSITORY-SCANNER-v0.2.md)
- [MSSP Classification Suggestions v0.2](spec/MSSP-CLASSIFICATION-SUGGESTIONS-v0.2.md)
- [MSSP Candidate Review and Promotion Protocol v0.2](spec/MSSP-CANDIDATE-PROMOTION-v0.2.md)
- [MSSP Architecture Drift Report v0.2](spec/MSSP-ARCHITECTURE-DRIFT-v0.2.md)
- [MSSP Git Diff Impact Analysis v0.2](spec/MSSP-GIT-DIFF-IMPACT-v0.2.md)
- [MSSP Visualization Model v0.3](spec/MSSP-VISUALIZATION-MODEL-v0.3.md)
- [MSSP Adapter Contract v0.3](spec/MSSP-ADAPTER-CONTRACT-v0.3.md)
- [MSSP EML Adapter v0.3](spec/MSSP-EML-ADAPTER-v0.3.md)
- [MSSP Python Adapter v0.3](spec/MSSP-PYTHON-ADAPTER-v0.3.md)

JSON diagnostic consumers should read `diagnostics[].code`; transitional v0.1 identifiers remain in `diagnostics[].legacyCode`.

## Repository intelligence pipeline

```text
Repository
  → deterministic scanner evidence
  → unclassified candidates
  → advisory classification suggestions
  → explicit review decision
  → blocked contract draft
  → contract completion
  → independent final approval
  → manifest emission
  → separate project registration
```

The scanner currently recognizes common Node.js, Python, Rust, Go, Godot, JVM, and .NET markers; npm, pnpm, and Cargo workspaces; root and nested `.gitignore` evidence; generated-source conventions; and static references for JavaScript/TypeScript, Python, Go, Rust, and GDScript.

Static dependencies remain in `discovery.dependencies`. They do not become approved runtime `relations`.

Classification suggestions may propose `FMS`, `SCL`, `SMS`, `TMS`, `DMS`, `ROUTER`, `RUNTIME`, or `UNDETERMINED`, but always preserve:

```json
{
  "mode": "advisory",
  "autoPromotion": false,
  "status": "review-required"
}
```

## Candidate review and promotion

```text
Suggestion ≠ Review decision
Review approval ≠ Completed contract
Completed contract ≠ Final approval
Manifest emission ≠ Project registration
```

An approved candidate begins with a deliberately incomplete contract draft. Remaining TODO values, unresolved conditions, a truncated scan, missing executable entry, incomplete TMS activation, missing failure behavior, missing validation, or missing tests block promotion.

A final approver must be different from the classification reviewer. Emitted manifests preserve review and approval provenance under `metadata.promotion`. Promotion does not edit `mssp.yaml` or create runtime relations.

Traditional Chinese guide: [Candidate review and promotion](docs/candidate-promotion.zh-TW.md).

## Architecture drift report

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

The report checks canonical FMS document presence, parses the explicit `ID` and `Layer` table in `FMS/01_MODULE_INDEX.md`, compares index rows with module manifests, and verifies executable-source ownership under configured layers.

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

`consistent` means structural consistency only. Prose semantics, runtime behavior, deployment topology, and historical equivalence are not proven.

Traditional Chinese guide: [Architecture drift](docs/architecture-drift.zh-TW.md).

## Git diff impact analysis

```text
Git changed paths
      ↓
Direct module ownership
      ↓
Declared MSSP-VT propagation
      ↓
Review obligations
```

Run:

```bash
node dist/cli.js impact examples/hello-mssp \
  --base origin/main \
  --head HEAD \
  --revision HEAD \
  --out git-diff-impact.json
```

The analyzer uses direct Git name-status evidence with rename detection. It distinguishes module manifests, declared entries, and other module-owned paths. Additions, deletions, and renames crossing the MSSP project boundary retain explicit `into-project` or `out-of-project` transitions.

Impact propagates through current declarations:

```text
A.changeImpact.affects contains B
B.changeImpact.affectedBy contains A
B.requires.modules contains A
B.compatibility.modules contains A
```

The report may require `fms`, `scl`, `module-contract`, `version`, `compatibility`, `tests`, and `island` review.

Every report preserves:

```json
{
  "analysis": {
    "mode": "static-conservative",
    "semanticCompatibility": false,
    "autoVersionBump": false,
    "autoMutation": false
  }
}
```

`impact-detected` means the review scope is known. It does not mean the change is incompatible. `indeterminate` means ownership, relation targets, path transitions, or generated-source provenance remain incomplete. The analyzer never chooses patch, minor, or major version increments.

Traditional Chinese guide: [Git diff impact](docs/git-diff-impact.zh-TW.md).

## Interactive architecture visualization

```text
Intermediate Model
       ↓ deterministic read-only projection
Visualization Model
       ↓ self-contained renderer
Searchable layered architecture view
```

Run:

```bash
node dist/cli.js viz examples/hello-mssp \
  --format html \
  --revision HEAD \
  --source-base https://github.com/OWNER/REPO/blob/BRANCH \
  --out architecture.html
```

The HTML output contains its CSS, JavaScript, and model payload in one file. It loads no CDN, external font, analytics, or runtime library. It supports layer filters, search, node inspection, relation drawing, and optional source links.

The Visualization Model distinguishes:

```text
module     → declared MSSP layer
candidate  → UNCLASSIFIED
reference  → UNRESOLVED
```

It preserves:

```json
{
  "invariants": {
    "readOnly": true,
    "autoMutation": false
  }
}
```

Displaying a candidate does not approve it. Displaying a relation does not prove runtime execution or compatibility.

Traditional Chinese guide: [Visualization](docs/visualization.zh-TW.md).

## Adapter interoperability: EML and Python

```text
External parser / editor / compiler / packaging tool
                        ↓ versioned semantic export
                   MSSP Adapter Registry
                        ↓ deterministic translation
                 MSSP Intermediate Model
```

Every conforming adapter publishes a machine-readable descriptor and preserves:

```json
{
  "deterministic": true,
  "readOnly": true,
  "noExecution": true,
  "noNetwork": true,
  "autoPromotion": false,
  "autoMutation": false
}
```

The registry currently exposes:

```text
eml-mssp-export       aliases: eml
python-mssp-export    aliases: python, py
```

The EML adapter consumes `eml-mssp-export` v0.3 JSON:

```bash
node dist/cli.js adapt eml examples/eml-adapter/semantic-export.json \
  --revision HEAD \
  --out eml-intermediate-model.json
```

It does not parse raw `.eml`, execute EML, resolve imports, or modify the project. A complete explicit EML `declaration` maps to a module representation. A symbol without that declaration remains an `unclassified` candidate even when its EML `symbolKind` is `module`.

The Python adapter consumes `python-mssp-export` v0.3 JSON:

```bash
node dist/cli.js adapt python examples/python-adapter/semantic-export.json \
  --revision HEAD \
  --out python-intermediate-model.json
```

It preserves distribution metadata, Python requirements, build-backend identity, qualified names, import paths, and entry points as source metadata. It does not import or execute Python, inspect a virtual environment, invoke package managers or build backends, resolve imports, or modify the project.

A Python package, plugin, command, service, import path, or entry point is not architecture authority. Only a complete explicit `declaration` maps to an Intermediate Module; otherwise the component remains an `unclassified` candidate.

Normative `requires`, `affects`, and `affected-by` relations are produced only from complete declarations, never from imports, package dependencies, entry points, names, or source proximity.

The shared Declarative Adapter Builder normalizes explicit declarations, candidates, relations, source provenance, and stable ordering. Ecosystem adapters retain separate input schemas and metadata mappings.

Adapter output represents source declarations; it does not prove SCL approval, compatibility, registration, runtime loading, or deployment readiness.

Traditional Chinese guide: [Adapters, EML, and Python](docs/adapters.zh-TW.md).

## Module contract example

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
Validator / Graph / Viz / IDE / Agent / Drift / Impact Analysis
```

The model separates approved `modules` from unclassified `candidates`, and normative `relations` from scanner-derived `discovery.dependencies`.

## Relationship to EML

```text
MSSP = architecture organization, capability placement, subset governance
EML  = semantic expression, compression, executable language tooling
```

The `eml-mssp-export` reference adapter translates an explicit EML semantic export into the Intermediate Model without importing the EML parser, runtime, editor, or emitters. A future EML toolchain may produce that export directly; raw EML parsing remains outside MSSP Core.

## Repository map

```text
schemas/                    Normative schemas
src/                        TypeScript core and CLI
examples/hello-mssp/        Complete MSSP reference adoption
examples/eml-adapter/       EML semantic-export reference fixture
examples/python-adapter/    Python semantic-export reference fixture
spec/                       Normative and interoperability specifications
docs/                       Adoption, protocol, roadmap, and research guides
.github/                     CI and architecture-review workflow
```

## Status

`v0.1.0` is the architecture-contract MVP. The principal v0.2 repository-intelligence vertical slices are implemented: diagnostics, Intermediate Model, scanner, static dependency evidence, advisory classification, governed promotion, structural drift, and Git diff impact analysis.

The v0.3 visualization foundation, Adapter Contract, deterministic Adapter Registry, shared Declarative Adapter Builder, EML reference adapter, and Python reference adapter are implemented. Both adapters include machine-readable descriptor and input schemas, conformance evaluation, public APIs, CLI execution, reference fixtures, tests, specifications, and CI artifacts.

Rust, Godot, and Agent Skill adapters remain future work. Compiler-grade AST dependency extraction, complete language alias resolution, full Git-ignore equivalence, generated-source provenance, patch-hunk or symbol-level impact analysis, and automatic semantic-version selection remain outside the current reference implementation.

## License

Apache-2.0. Copyright 2026 Neo.K / EVEMISSLAB.
