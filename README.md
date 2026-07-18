# MSSP Core MVP

[繁體中文](README.zh-TW.md)

**MSSP (Mother-Set and Subset Paradigm)** is a language-agnostic architecture method for making complex systems understandable, navigable, testable, governable, observable, and evolvable.

It represents system identity, stable capabilities, optional subsets, change authority, diagnostics, routing, execution, compatibility, and change impact as machine-readable contracts.

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

## Implemented commands

```text
init · lint · explain · graph · island · model · scan · classify
review-candidate · promote-candidate · drift · impact · route · viz
adapters · adapt
```

## Authority boundaries

```text
Scanner evidence        != architecture declaration
Classification          != promotion
Manifest emission       != project registration
Drift consistency       != semantic equivalence
Impact detected         != incompatibility
Router selected         != activated or executed
Permission match        != permission grant
Compatibility satisfied != runtime compatibility proof
Visualization           != architecture authority
Adapter metadata        != module declaration
```

## Router Contract Evaluator v0.4

```bash
node dist/cli.js route examples/hello-mssp \
  --request examples/hello-mssp/router-request.json \
  --revision HEAD \
  --out router-evaluation.json
```

Only declared TMS modules are candidates. The evaluator checks activation conditions, input/output contracts, module dependencies, tools, data, declared permissions, risk ceilings, MSSP compatibility, and required-module compatibility.

```text
selected       exactly one eligible TMS and no uncertainty
ambiguous      multiple eligible TMS modules
no-match       no eligible TMS and no uncertainty
indeterminate  unsupported or incomplete evidence remains
```

It never silently ranks multiple eligible modules and never executes or activates a module.

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

## Other implemented foundations

- v0.2 repository scanning, advisory classification, governed promotion, drift, and Git impact analysis.
- v0.3 deterministic visualization with multi-view bounded rendering.
- v0.3 Agent Skill, EML, Godot, Python, and Rust semantic-export adapters.

Only complete explicit declarations become modules. Unclassified evidence remains unclassified.

## Specifications

- [Intermediate Model v0.2](spec/MSSP-INTERMEDIATE-MODEL-v0.2.md)
- [Visualization Model v0.3](spec/MSSP-VISUALIZATION-MODEL-v0.3.md)
- [Adapter Contract v0.3](spec/MSSP-ADAPTER-CONTRACT-v0.3.md)
- [Router Contract Evaluator v0.4](spec/MSSP-ROUTER-CONTRACT-EVALUATOR-v0.4.md)
- [Router guide — Traditional Chinese](docs/router-contract-evaluator.zh-TW.md)

## Status

- v0.1 architecture-contract MVP: complete.
- Principal v0.2 repository-intelligence slices: complete.
- v0.3 visualization and five reference adapters: complete.
- v0.4 Router Contract Evaluator foundation: complete.
- Runtime planning, DMS trace transport, SCL enforcement, and risk-aware execution remain open.

See [Roadmap](docs/roadmap.md) and [Validation Report](VALIDATION-REPORT.md).

## License

Apache-2.0. Copyright 2026 Neo.K / EVEMISSLAB.
