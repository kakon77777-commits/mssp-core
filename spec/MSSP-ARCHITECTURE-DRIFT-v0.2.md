# MSSP Architecture Drift Report v0.2

Status: Draft normative specification for MSSP Core v0.2.

## 1. Purpose

The Architecture Drift Report compares machine-readable architecture declarations with bounded, statically observable repository evidence.

It answers a deliberately narrow question:

> Are canonical FMS records, module manifests, configured layer boundaries, and observed source ownership still mutually consistent?

It does not prove semantic equivalence between documentation and behavior.

## 2. Command

```bash
mssp drift [project] [--revision value] [--max-files number] [--out file]
```

The command MUST be read-only. It MUST NOT modify FMS, module manifests, source files, dependency relations, or project registration.

## 3. Report identity

A conforming report uses:

```json
{
  "schemaVersion": "0.2",
  "kind": "mssp-architecture-drift-report"
}
```

The normative JSON Schema is `schemas/architecture-drift.schema.json`.

## 4. Analysis boundary

Every report MUST preserve:

```json
{
  "analysis": {
    "mode": "static-conservative",
    "semanticEquivalence": false,
    "autoMutation": false
  }
}
```

`semanticEquivalence: false` means that a clean report is evidence of structural consistency only. It is not evidence that prose, contracts, implementation, deployment, or runtime behavior mean the same thing.

## 5. Canonical FMS profile

The reference v0.2 profile recognizes:

- `FMS/00_SYSTEM_NARRATIVE.md`
- `FMS/01_MODULE_INDEX.md`
- `FMS/02_ARCHITECTURE_NOTES.md`

A profile MAY define equivalents in the future. The v0.2 reference implementation reports a missing canonical document as drift rather than inventing an equivalent.

## 6. Module-index parsing

The reference parser accepts a Markdown table containing exact `ID` and `Layer` columns, case-insensitively.

It MUST NOT infer authoritative module declarations from unrestricted prose.

The analyzer compares this table with discovered `*.mssp.yaml` and `*.mssp.yml` manifests and reports:

- declared module missing from FMS index;
- FMS index row without a declared module;
- FMS/manifest layer disagreement;
- duplicate module-index rows;
- an indeterminate result when the table cannot be parsed.

## 7. Source ownership

The analyzer performs a bounded inventory under configured MSSP layer roots.

Generated-source conventions recognized by the Repository Scanner are excluded from ownership findings. Common dependency, build, cache, and editor-output directories are skipped.

For executable layers, every observed executable source file SHOULD be covered by exactly one declared module boundary.

The analyzer reports:

- source outside every declared module boundary;
- source covered by overlapping module boundaries;
- executable source inside FMS or SCL;
- incomplete analysis when the file bound is reached.

An observed file does not automatically become a module, dependency, or approved architecture relation.

## 8. Status and severity

Finding status is:

- `drift`: positive structural disagreement;
- `indeterminate`: evidence is insufficient for a structural conclusion.

Report status is:

- `consistent`: no findings;
- `drift-detected`: at least one drift finding;
- `indeterminate`: no drift finding, but at least one indeterminate finding.

`summary.ok` is false when at least one error-severity finding exists. Warning-only drift remains machine-visible without necessarily failing CI.

## 9. Stable codes

| Code | Meaning |
|---|---|
| `MSSP_DRIFT_001` | canonical FMS document missing |
| `MSSP_DRIFT_002` | module index cannot be parsed conservatively |
| `MSSP_DRIFT_003` | declared module missing from FMS index |
| `MSSP_DRIFT_004` | FMS index references undeclared module |
| `MSSP_DRIFT_005` | FMS and manifest layer mismatch |
| `MSSP_DRIFT_006` | duplicate FMS module-index entry |
| `MSSP_DRIFT_007` | executable source has no declared module owner |
| `MSSP_DRIFT_008` | executable source has overlapping owners |
| `MSSP_DRIFT_009` | bounded inventory is incomplete |
| `MSSP_DRIFT_010` | executable source exists in FMS or SCL |

Codes are public protocol identifiers and MUST NOT be repurposed with incompatible meanings.

## 10. Evidence

Each finding separates:

- `declared`: manifest or architecture-contract evidence;
- `observed`: FMS, source, or scan evidence;
- `suggestedActions`: review-oriented remediation guidance.

Evidence is not approval. Suggested actions do not authorize mutation.

## 11. Non-goals

v0.2 does not provide:

- semantic comparison of narrative prose and implementation;
- compiler-grade dependency reconstruction;
- runtime trace comparison;
- deployment-topology comparison;
- historical drift baselines;
- Git diff impact inference;
- automatic repair or manifest registration.

These boundaries MUST remain explicit in consumers and user interfaces.
