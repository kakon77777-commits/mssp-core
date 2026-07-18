# MSSP Core MVP

[繁體中文](README.zh-TW.md)

**MSSP (Mother-Set and Subset Paradigm)** is a language-agnostic architecture method for making complex systems understandable, navigable, testable, governable, observable, and evolvable.

```text
MSSP = (FMS, SCL, SMS, TMS, DMS, Router, Runtime)
```

Implemented foundations:

- v0.1 architecture contracts, validation, graphing, and TMS island tests;
- v0.2 repository scanning, advisory classification, governed promotion, drift, and Git impact;
- v0.3 multi-view visualization and Agent Skill, EML, Godot, Python, and Rust adapters;
- v0.4 Router Contract Evaluator.

## Router v0.4

```bash
node dist/cli.js route examples/hello-mssp \
  --request examples/hello-mssp/router-request.json \
  --revision HEAD \
  --out router-evaluation.json
```

Only declared TMS modules are candidates.

```text
selected       one eligible TMS and no uncertainty
ambiguous      multiple eligible TMS modules
no-match       no eligible TMS and no uncertainty
indeterminate  unsupported or incomplete evidence remains
```

```text
Router selected         != activated or executed
Permission match        != permission grant
Compatibility satisfied != runtime compatibility proof
```

The evaluator is deterministic, read-only, offline, non-executing, non-activating, and non-mutating. It never silently ranks multiple eligible modules.

## Core commands

```text
init · lint · explain · graph · island · model · scan · classify
review-candidate · promote-candidate · drift · impact · route · viz
adapters · adapt
```

## Specifications

- [Intermediate Model v0.2](spec/MSSP-INTERMEDIATE-MODEL-v0.2.md)
- [Visualization Model v0.3](spec/MSSP-VISUALIZATION-MODEL-v0.3.md)
- [Adapter Contract v0.3](spec/MSSP-ADAPTER-CONTRACT-v0.3.md)
- [Router Contract Evaluator v0.4](spec/MSSP-ROUTER-CONTRACT-EVALUATOR-v0.4.md)
- [Router guide — Traditional Chinese](docs/router-contract-evaluator.zh-TW.md)

See [Roadmap](docs/roadmap.md) and [Validation Report](VALIDATION-REPORT.md).

## License

Apache-2.0. Copyright 2026 Neo.K / EVEMISSLAB.
