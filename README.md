# MSSP Core MVP

[繁體中文](README.zh-TW.md)

**MSSP (Mother-Set and Subset Paradigm)** is a language-agnostic architecture method for making complex systems understandable, navigable, testable, governable, observable, and evolvable.

It is not an application framework or a folder-naming convention. MSSP represents system identity, stable capabilities, optional subsets, change authority, diagnostics, routing, execution, compatibility, and change impact as machine-readable contracts.

## Core model

```text
MSSP = (FMS, SCL, SMS, TMS, DMS, Router, Runtime)
```

| Layer | Responsibility | Core invariant |
|---|---|---|
| FMS | System identity and canonical architecture records | Declarative only; no executable source. |
| SCL | Change authority, approval, and prohibition | Governs who may change what and under which conditions. |
| SMS | Stable capabilities required for system closure | Must not depend on optional TMS modules. |
| TMS | Optional, replaceable, or removable capabilities | Depends only on declared SMS capabilities and remains island-testable. |
| DMS | Observation, diagnostics, and explanation | Produces evidence without owning business state. |
| Router | Contract-based optional-subset selection | Does not turn TMS into hidden core dependencies. |
| Runtime | Approved-plan execution | Executes declared modules and emits observable evidence. |

MSSP-VT is represented by each module's `version`, `compatibility`, and `changeImpact` declarations.

## Implemented command surface

```text
mssp init
mssp lint
mssp explain
mssp graph
mssp island
mssp model
mssp scan
mssp classify
mssp review-candidate
mssp promote-candidate
mssp drift
mssp impact
mssp route
mssp viz
mssp adapters
mssp adapt
```

Key boundaries:

```text
Scanner evidence        != architecture declaration
Classification          != promotion
Review approval         != completed contract
Manifest emission       != project registration
Drift consistency       != semantic equivalence
Impact detected         != incompatibility
Router selected         != activated or executed
Permission match        != permission grant
Compatibility satisfied != runtime compatibility proof
Visualization           != architecture authority
Projection grouping     != canonical layer mutation
Hidden renderer data    != absent architecture
Adapter metadata        != module declaration or permission grant
```

## Quick start

```bash
npm install
npm run build

node dist/cli.js lint examples/hello-mssp
node dist/cli.js model examples/hello-mssp --revision HEAD --out intermediate-model.json
node dist/cli.js scan . --revision HEAD --max-files 10000 --out repository-scan.json
node dist/cli.js classify . --revision HEAD --max-files 10000 --out classification-suggestions.json
node dist/cli.js drift examples/hello-mssp --revision HEAD --out architecture-drift.json
node dist/cli.js impact examples/hello-mssp --base HEAD^1 --head HEAD --revision HEAD --out git-diff-impact.json
node dist/cli.js route examples/hello-mssp --request examples/hello-mssp/router-request.json --revision HEAD --out router-evaluation.json
node dist/cli.js viz examples/hello-mssp --format html --view layer --revision HEAD --out architecture.html
node dist/cli.js graph examples/hello-mssp --format mermaid --out architecture.mmd
```

## Intermediate Model pipeline

```text
MSSP YAML / Repository Scanner / External Semantic Export
                          ↓
               MSSP Intermediate Model v0.2
                          ↓
Validator / Graph / Visualization / IDE / Agent / Drift / Impact
```

The model keeps declared modules separate from unclassified candidates, normative relations separate from discovery evidence, portable provenance separate from local environment state, and source representation separate from architecture approval.

## Repository intelligence

The v0.2 pipeline performs deterministic bounded scanning, advisory classification, explicit review, blocked contract drafting, independent approval, manifest emission, and separate project registration.

Static references remain under `discovery.dependencies`. They do not become approved runtime relations.

## Router governance

`mssp route` evaluates declared TMS modules against an explicit Router Request without loading or executing them.

```bash
node dist/cli.js route examples/hello-mssp \
  --request examples/hello-mssp/router-request.json \
  --revision HEAD \
  --out router-evaluation.json
```

The evaluator checks activation conditions, inputs, outputs, module dependencies, tools, data, permissions, risk, MSSP compatibility, and required-module compatibility.

Only declared TMS modules are candidates. Results are:

```text
selected       exactly one eligible TMS and no uncertainty
ambiguous      multiple eligible TMS modules
no-match       no eligible TMS and no uncertainty
indeterminate  unsupported or incomplete evidence remains
```

The evaluator never silently ranks multiple eligible modules. Unsupported condition or version syntax remains indeterminate.

```json
{
  "deterministic": true,
  "readOnly": true,
  "noExecution": true,
  "noNetwork": true,
  "autoActivation": false,
  "autoMutation": false,
  "runtimeCompatibilityProof": false
}
```

A `selected` result is static contract eligibility only. SCL approval, permission grant, execution planning, activation, and runtime compatibility proof remain separate stages.

## Visualization

`mssp viz` generates deterministic JSON or self-contained interactive HTML with `layer`, `status`, `risk`, and `connectivity` projections.

The renderer supports search, group filters, node inspection, source navigation, bounded-batch nodes, visible-endpoint edges, and configurable SVG limits. Complete nodes and edges remain embedded in the model.

Visualization preserves `readOnly: true` and `autoMutation: false`.

## Adapter interoperability

MSSP Core consumes versioned semantic exports instead of importing source runtimes, compilers, editors, package managers, or agent frameworks.

Current reference adapters:

| Adapter ID | CLI aliases |
|---|---|
| `agent-skill-mssp-export` | `agent-skill`, `skill` |
| `eml-mssp-export` | `eml` |
| `godot-mssp-export` | `godot`, `gd` |
| `python-mssp-export` | `python`, `py` |
| `rust-mssp-export` | `rust`, `rs` |

Only complete explicit declarations map to Intermediate Modules. Undeclared source entities remain unclassified candidates. Imports, dependencies, entry points, signals, prompts, permissions, handoffs, and source metadata do not become normative architecture authority.

## Normative specifications

### v0.2 repository intelligence

- [Diagnostic Protocol v0.2](spec/MSSP-DIAGNOSTIC-PROTOCOL-v0.2.md)
- [Intermediate Model v0.2](spec/MSSP-INTERMEDIATE-MODEL-v0.2.md)
- [Repository Scanner v0.2](spec/MSSP-REPOSITORY-SCANNER-v0.2.md)
- [Classification Suggestions v0.2](spec/MSSP-CLASSIFICATION-SUGGESTIONS-v0.2.md)
- [Candidate Review and Promotion v0.2](spec/MSSP-CANDIDATE-PROMOTION-v0.2.md)
- [Architecture Drift v0.2](spec/MSSP-ARCHITECTURE-DRIFT-v0.2.md)
- [Git Diff Impact v0.2](spec/MSSP-GIT-DIFF-IMPACT-v0.2.md)

### v0.3 visualization and adapters

- [Visualization Model v0.3](spec/MSSP-VISUALIZATION-MODEL-v0.3.md)
- [Adapter Contract v0.3](spec/MSSP-ADAPTER-CONTRACT-v0.3.md)
- [EML Adapter v0.3](spec/MSSP-EML-ADAPTER-v0.3.md)
- [Python Adapter v0.3](spec/MSSP-PYTHON-ADAPTER-v0.3.md)
- [Rust Adapter v0.3](spec/MSSP-RUST-ADAPTER-v0.3.md)
- [Godot Adapter v0.3](spec/MSSP-GODOT-ADAPTER-v0.3.md)
- [Agent Skill Adapter v0.3](spec/MSSP-AGENT-SKILL-ADAPTER-v0.3.md)

### v0.4 runtime governance

- [Router Contract Evaluator v0.4](spec/MSSP-ROUTER-CONTRACT-EVALUATOR-v0.4.md)

Traditional Chinese guides are under [`docs/`](docs/), including the [Router guide](docs/router-contract-evaluator.zh-TW.md) and [Visualization guide](docs/visualization.zh-TW.md).

## Current status

- v0.1 architecture-contract MVP: complete.
- Principal v0.2 repository-intelligence vertical slices: complete.
- v0.3 visualization and five reference adapters: complete.
- v0.4 Router Contract Evaluator foundation: complete.
- Runtime execution planning, DMS trace transport, SCL enforcement hooks, and risk-aware execution policy remain open.

See [Roadmap](docs/roadmap.md) and [Validation Report](VALIDATION-REPORT.md).

## License

Apache-2.0. Copyright 2026 Neo.K / EVEMISSLAB.
