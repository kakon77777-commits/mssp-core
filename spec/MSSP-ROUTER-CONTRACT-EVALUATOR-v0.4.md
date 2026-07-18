# MSSP Router Contract Evaluator v0.4

Status: Draft interoperability specification.

## Purpose

The Router Contract Evaluator determines whether declared TMS modules are statically eligible for an explicit request.

```text
Project contracts + Router Request
              ↓
Router Evaluation Report
              ↓ separate governed stage
Possible execution planning
```

The evaluator does not execute, load, activate, rank, mutate, register, or deploy modules.

## Protocol identity

A Router Request uses `schemaVersion: "0.4"` and `kind: "mssp-router-request"`.

A Router Evaluation Report uses `schemaVersion: "0.4"` and `kind: "mssp-router-evaluation-report"`.

Normative Schemas:

- `schemas/router-request.schema.json`
- `schemas/router-evaluation.schema.json`

## Candidate boundary

Only modules already declared with `layer: TMS` are candidates. Scanner candidates and modules in other layers are not selectable TMS candidates.

An explicit target that is not a declared TMS produces `MSSP_ROUTE_015` and makes the overall result indeterminate.

## Router Request

The request declares:

- request identity and descriptive intent;
- explicit scalar facts;
- MSSP version;
- available inputs, modules, tools, and data;
- required outputs;
- requested operations;
- maximum risk level;
- optional target-module narrowing.

Set-like arrays contain unique non-empty strings and are normalized deterministically. `intent` is descriptive only; the reference evaluator performs no natural-language ranking.

## Activation conditions

The reference language `mssp-exact-condition-v0.4` supports only:

```text
<fact> == <literal>
<fact> != <literal>
```

Literals may be strings, numbers, booleans, or null. Facts come only from `request.facts`. Every `activateWhen` condition must match.

- unmatched valid condition: `MSSP_ROUTE_002`, rejected;
- unsupported or malformed condition: `MSSP_ROUTE_003`, indeterminate.

The evaluator does not execute expression-language or source-system code.

## Compatibility ranges

The reference language `numeric-comparator-range-v0.4` supports whitespace-separated numeric comparators:

```text
>=0.1 <0.2
<=1.2.3
>0.1
=0.1.0
0.1.0
*
```

Missing minor or patch components are treated as zero. Caret, tilde, logical OR, prerelease, build metadata, and ecosystem-specific rules are unsupported and produce `MSSP_ROUTE_014` with an indeterminate result.

A satisfied range is not runtime compatibility proof.

## Evaluation dimensions

Each declared TMS is checked independently:

| Dimension | Failure code |
|---|---|
| Outside explicit target set | `MSSP_ROUTE_001` |
| Activation condition unmatched | `MSSP_ROUTE_002` |
| Activation syntax unsupported | `MSSP_ROUTE_003` |
| Required input unavailable | `MSSP_ROUTE_004` |
| Required output undeclared | `MSSP_ROUTE_005` |
| Required module unknown or unavailable | `MSSP_ROUTE_006` |
| Required tool unavailable | `MSSP_ROUTE_007` |
| Required data unavailable | `MSSP_ROUTE_008` |
| Requested operation not permitted | `MSSP_ROUTE_009` |
| Requested operation explicitly denied | `MSSP_ROUTE_010` |
| Risk exceeds request ceiling | `MSSP_ROUTE_011` |
| MSSP version incompatible | `MSSP_ROUTE_012` |
| Required module version incompatible | `MSSP_ROUTE_013` |
| Compatibility syntax unsupported | `MSSP_ROUTE_014` |
| Explicit target is not declared TMS | `MSSP_ROUTE_015` |

`requestedPermissions` lists operations the selected module would need to perform. Passing the check does not grant permission; SCL and runtime authorization remain separate.

Risk order is:

```text
L0 < L1 < L2 < L3 < L4
```

## Candidate decision

A candidate is `eligible`, `rejected`, or `indeterminate`.

Decision precedence:

1. any rejection reason -> `rejected`;
2. otherwise any uncertainty reason -> `indeterminate`;
3. otherwise -> `eligible`.

## Overall status

The summary status is `selected`, `ambiguous`, `no-match`, or `indeterminate`.

- exactly one eligible candidate with no uncertainty or report findings -> `selected`;
- more than one eligible candidate -> `ambiguous`;
- no eligible or indeterminate candidates and no findings -> `no-match`;
- every other case -> `indeterminate`.

`selectedModuleIds` is populated only for `selected`. An ambiguous result preserves every eligible ID but never silently ranks or chooses one.

## CLI

```bash
mssp route [project] \
  --request router-request.json \
  [--revision value] \
  [--out router-evaluation.json]
```

Exit code is zero only for `selected`. Other statuses return non-zero as a governance signal.

## Determinism

For identical inputs, serialized output is equivalent. The reference implementation sorts facts, set-like arrays, candidates, matched conditions, reasons, and eligible IDs; includes no generated timestamp; and does not mutate input objects.

## Mandatory invariants

```json
{
  "evaluation": {
    "mode": "static-contract",
    "conditionLanguage": "mssp-exact-condition-v0.4",
    "compatibilityLanguage": "numeric-comparator-range-v0.4",
    "deterministic": true,
    "readOnly": true,
    "noExecution": true,
    "noNetwork": true,
    "autoActivation": false,
    "autoMutation": false,
    "runtimeCompatibilityProof": false
  }
}
```

## Authority boundary

```text
eligible         != activated
selected         != executed
selected         != SCL approval
permission match != permission grant
range satisfied  != runtime compatibility proof
targeted         != declared TMS
ambiguous        != permission to choose arbitrarily
no-match         != permission to bypass contracts
```

## Conformance

A conforming evaluator validates both Schemas, considers only declared TMS modules, preserves rejection and uncertainty evidence, refuses silent tie-breaking, keeps unsupported syntax indeterminate, remains deterministic and non-mutating, and performs no module execution, activation, network access, deployment, or registration.
