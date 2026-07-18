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
node dist/cli.js route examples/hello-mssp --request examples/hello-mssp/router-request.json --revision HEAD --out router-evaluation.json
node dist/cli.js viz examples/hello-mssp --format html --view layer --revision HEAD --out architecture.html
```

## Router governance

`mssp route` evaluates declared TMS modules against explicit request facts and contracts without loading or executing them.

```text
selected       exactly one eligible TMS and no uncertainty
ambiguous      multiple eligible TMS modules
no-match       no eligible TMS and no uncertainty
indeterminate  unsupported or incomplete evidence remains
```

It checks activation conditions, input/output contracts, required modules, tools, data, declared permissions, risk ceilings, MSSP compatibility, and required-module compatibility. It never silently ranks multiple eligible modules.

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

A `selected` result is static eligibility only. SCL approval, permission grant, execution planning, activation, and runtime compatibility proof remain separate stages.

## Visualization

`mssp viz` generates deterministic JSON or self-contained interactive HTML with `layer`, `status`, `risk`, and `connectivity` projections. Bounded DOM and SVG rendering keeps complete model data embedded while limiting visible browser work.

## Adapter interoperability

MSSP Core consumes versioned semantic exports instead of importing source runtimes. Current reference adapters cover Agent Skill, EML, Godot, Python, and Rust.

Only complete explicit declarations map to Intermediate Modules. Undeclared source entities remain unclassified candidates. Source metadata does not become architecture authority or a permission grant.

## Specifications

- [Repository intelligence v0.2](spec/MSSP-INTERMEDIATE-MODEL-v0.2.md)
- [Visualization Model v0.3](spec/MSSP-VISUALIZATION-MODEL-v0.3.md)
- [Adapter Contract v0.3](spec/MSSP-ADAPTER-CONTRACT-v0.3.md)
- [Router Contract Evaluator v0.4](spec/MSSP-ROUTER-CONTRACT-EVALUATOR-v0.4.md)
- [Traditional Chinese Router guide](docs/router-contract-evaluator.zh-TW.md)

## Current status

- v0.1 architecture-contract MVP: complete.
- Principal v0.2 repository-intelligence vertical slices: complete.
- v0.3 visualization and five reference adapters: complete.
- v0.4 Router Contract Evaluator foundation: complete.
- Runtime planning, DMS trace transport, SCL enforcement hooks, and risk-aware execution policy remain open.

See [Roadmap](docs/roadmap.md) and [Validation Report](VALIDATION-REPORT.md).

## License

Apache-2.0. Copyright 2026 Neo.K / EVEMISSLAB.
