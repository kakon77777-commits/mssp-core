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

The model keeps the following categories separate:

```text
declared modules       vs unclassified candidates
normative relations   vs scanner discovery evidence
portable provenance   vs local environment state
source representation vs architecture approval
```

## Repository intelligence

The current v0.2 pipeline is:

```text
Repository
  → deterministic bounded scan
  → unclassified candidates
  → advisory classification suggestions
  → explicit review decision
  → deliberately incomplete contract draft
  → contract completion
  → independent final approval
  → manifest emission
  → separate project registration
```

The scanner recognizes common Node.js, Python, Rust, Go, Godot, JVM, and .NET markers; npm, pnpm, and Cargo workspaces; nested `.gitignore` evidence; generated-source conventions; and static references for JavaScript/TypeScript, Python, Go, Rust, and GDScript.

Static references remain under `discovery.dependencies`. They do not become approved runtime relations.

## Visualization

`mssp viz` generates either deterministic JSON or a self-contained interactive HTML file.

```bash
node dist/cli.js viz examples/hello-mssp \
  --format html \
  --view connectivity \
  --large-graph-threshold 500 \
  --initial-node-limit 200 \
  --batch-size 200 \
  --max-rendered-edges 2000 \
  --revision HEAD \
  --source-base https://github.com/OWNER/REPO/blob/BRANCH \
  --out architecture.html
```

The HTML view contains its own CSS, JavaScript, and model payload. It loads no CDN, external font, analytics service, or runtime library.

Deterministic read-only projections:

```text
layer         canonical MSSP layers
status        declared / unclassified / unresolved
risk          L0–L4 / UNSPECIFIED
connectivity  isolated / leaf / connected / hub
```

Every projection contains every node exactly once. Projection grouping never changes a node's canonical layer, status, source, declaration, or relations. Risk is never inferred for unspecified nodes, and relation degree is not treated as importance, authority, quality, or runtime centrality.

Large-graph behavior is explicit in `scale`:

```text
bounded-batch nodes
visible-endpoints-only edges
configurable initial node limit and batch size
configurable maximum rendered SVG paths
complete nodes and edges remain embedded in the model
```

The renderer supports projection switching, projection-group filters, search, node inspection, relation drawing, incremental `Show more`, and optional source navigation.

Visualization preserves:

```json
{
  "readOnly": true,
  "autoMutation": false
}
```

## Adapter interoperability

MSSP Core consumes versioned semantic exports instead of importing source runtimes, compilers, editors, package managers, or agent frameworks.

```text
External source-aware exporter
            ↓ versioned JSON
      MSSP Adapter Registry
            ↓ deterministic translation
      Intermediate Model v0.2
```

List descriptors:

```bash
node dist/cli.js adapters
node dist/cli.js adapters --json --out adapter-descriptors.json
```

Current reference adapters:

| Adapter ID | CLI aliases | Input |
|---|---|---|
| `agent-skill-mssp-export` | `agent-skill`, `skill` | Agent/skill semantic export v0.3 |
| `eml-mssp-export` | `eml` | EML semantic export v0.3 |
| `godot-mssp-export` | `godot`, `gd` | Godot semantic export v0.3 |
| `python-mssp-export` | `python`, `py` | Python semantic export v0.3 |
| `rust-mssp-export` | `rust`, `rs` | Rust semantic export v0.3 |

Examples:

```bash
node dist/cli.js adapt agent-skill examples/agent-skill-adapter/semantic-export.json --revision HEAD --out agent-skill-intermediate-model.json
node dist/cli.js adapt eml examples/eml-adapter/semantic-export.json --revision HEAD --out eml-intermediate-model.json
node dist/cli.js adapt godot examples/godot-adapter/semantic-export.json --revision HEAD --out godot-intermediate-model.json
node dist/cli.js adapt python examples/python-adapter/semantic-export.json --revision HEAD --out python-intermediate-model.json
node dist/cli.js adapt rust examples/rust-adapter/semantic-export.json --revision HEAD --out rust-intermediate-model.json
```

Every reference adapter preserves fixed invariants:

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

Only a complete explicit `declaration` maps to an Intermediate Module. An undeclared source entity remains an `unclassified` candidate, even when the source ecosystem calls it a module, package, crate, scene, autoload, plugin, agent, skill, tool, workflow, or service.

Normative relations are emitted only from explicit declaration fields:

```text
declaration.requirements.modules     → requires
declaration.changeImpact.affects     → affects
declaration.changeImpact.affectedBy  → affected-by
```

Imports, Cargo dependencies, entry points, scene inheritance, signals, tool names, prompts, triggers, permissions, handoffs, resource access, and naming similarity remain metadata or non-normative evidence.

For Agent Skill exports in particular:

```text
Required permission != permission grant
Tool name           != runtime dependency
Trigger             != activation approval
Handoff             != normative relation
Memory policy       != SCL approval
```

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

Traditional Chinese guides are available under [`docs/`](docs/), including the [Visualization guide](docs/visualization.zh-TW.md), consolidated [Adapter guide](docs/adapters.zh-TW.md), [Godot guide](docs/godot-adapter.zh-TW.md), and [Agent Skill guide](docs/agent-skill-adapter.zh-TW.md).

## Repository map

```text
schemas/                         Normative JSON Schemas
src/                             TypeScript reference implementation and CLI
examples/hello-mssp/             Complete MSSP adoption fixture
examples/agent-skill-adapter/    Agent Skill semantic-export fixture
examples/eml-adapter/            EML semantic-export fixture
examples/godot-adapter/          Godot semantic-export fixture
examples/python-adapter/         Python semantic-export fixture
examples/rust-adapter/           Rust semantic-export fixture
spec/                            Normative specifications
docs/                            Adoption, roadmap, and research guides
.github/                         CI and architecture-review workflows
```

## Current status

- v0.1 architecture-contract MVP: complete.
- Principal v0.2 repository-intelligence vertical slices: complete.
- v0.3 visualization, multi-view/large-graph foundation, and five reference-adapter vertical slices: complete.
- Canvas/WebGL virtualization, worker-based layout, clustering, and measured browser performance guarantees remain outside the current visualization renderer.
- Compiler-grade AST extraction, complete alias/build-graph resolution, full Git-ignore equivalence, generated-source provenance, runtime DMS transport, and automatic semantic-version selection remain outside the current implementation.

See [Roadmap](docs/roadmap.md) and [Validation Report](VALIDATION-REPORT.md).

## License

Apache-2.0. Copyright 2026 Neo.K / EVEMISSLAB.
