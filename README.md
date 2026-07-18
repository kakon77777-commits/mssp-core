# MSSP Core MVP

[繁體中文](README.zh-TW.md)

MSSP is a language-agnostic architecture method for understandable, testable, governable, observable, and evolvable systems.

```text
MSSP = (FMS, SCL, SMS, TMS, DMS, Router, Runtime)
```

Implemented foundations:

```text
v0.1  architecture contracts and validation
v0.2  repository intelligence, promotion, drift, and impact
v0.3  multi-view visualization and five adapters
v0.4  Router Contract Evaluator
```

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

The evaluator never silently ranks, executes, activates, registers, or mutates modules.

```text
selected               != activated or executed
permission match       != permission grant
compatibility satisfied != runtime compatibility proof
```

## Commands

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
