# MSSP Git Diff Impact Analysis v0.2

Status: Draft normative interoperability profile.

## 1. Purpose

MSSP Git Diff Impact Analysis maps an explicit Git comparison to reviewable architecture impact.

It answers:

- which declared modules contain changed paths;
- which other modules are transitively affected through MSSP-VT declarations;
- which compatibility, version, FMS, SCL, test, and TMS island reviews are required;
- where current ownership or version-impact evidence is insufficient.

It does not decide whether a change is semantically compatible.

## 2. Command

```text
mssp impact [project] --base <git-ref> [--head <git-ref>] [--revision <value>] [--out <file>]
```

`--base` is required. `--head` defaults to `HEAD`.

The comparison is direct:

```text
git diff --name-status --find-renames=50% <base> <head> --
```

The implementation MUST invoke Git without a shell and MUST treat Git paths as data.

## 3. Output identity

A conforming report has:

```json
{
  "schemaVersion": "0.2",
  "kind": "mssp-git-diff-impact-report",
  "analysis": {
    "mode": "static-conservative",
    "semanticCompatibility": false,
    "autoVersionBump": false,
    "autoMutation": false
  }
}
```

The normative Schema is `schemas/git-diff-impact.schema.json`.

## 4. Project scope

The analyzer locates the containing Git repository and converts Git-relative paths to MSSP-project-relative paths.

Files wholly outside the MSSP project are counted under `comparison.outsideProjectFiles` and are not assigned to project modules.

A rename or copy crossing the project boundary MUST retain a transition of:

- `into-project`; or
- `out-of-project`.

Ordinary changes and renames that stay inside the project use `within-project`.

## 5. Direct impact

A changed path directly impacts every declared module whose manifest directory contains that path.

The implementation distinguishes at least:

- module manifest changes;
- declared entry changes;
- other files inside the module boundary.

Overlapping ownership is not silently resolved. It is `indeterminate`.

A changed path under an executable MSSP layer but outside every declared module boundary is also `indeterminate`.

## 6. MSSP-VT propagation

Impact propagation uses current declared architecture only.

An edge from module A to module B exists when any of the following is declared:

1. `A.changeImpact.affects` contains B;
2. `B.changeImpact.affectedBy` contains A;
3. `B.requires.modules` contains A;
4. `B.compatibility.modules` contains A.

Propagation is transitive and cycle-safe.

The report MUST retain the relation kind used for every propagated impact.

A relation to an unknown module MUST NOT be ignored. It produces an `indeterminate` finding.

## 7. Review requirements

The reference profile emits these review kinds:

- `module-contract` for directly changed modules;
- `version` for directly changed modules;
- `compatibility` for transitively impacted modules;
- `tests` for every impacted module;
- `island` for impacted TMS modules;
- `fms` when project policy requires FMS review for architecture-relevant changes;
- `scl` when governance or project-level contracts changed.

A review requirement is an obligation to inspect and decide. It is not a failed validation by itself.

## 8. Finding registry

| Code | Meaning |
|---|---|
| `MSSP_IMPACT_001` | Project manifest changed; broad project-contract review required. |
| `MSSP_IMPACT_002` | FMS records changed; FMS review required. |
| `MSSP_IMPACT_003` | SCL records changed; governance review required. |
| `MSSP_IMPACT_004` | Changed executable-layer path has no declared module owner. |
| `MSSP_IMPACT_005` | Changed path has overlapping module ownership. |
| `MSSP_IMPACT_006` | MSSP-VT propagation references an unknown module. |
| `MSSP_IMPACT_007` | A declared manifest or entry path was deleted or moved out. |
| `MSSP_IMPACT_008` | Generated-source path changed without generator provenance. |
| `MSSP_IMPACT_010` | A module was marked transitively impacted through MSSP-VT. |

Codes are stable within the v0.2 profile. A future registry MAY add codes without changing existing meanings.

## 9. Report status

`summary.status` is one of:

- `no-impact`: no project-scoped changed path created an impact or review obligation;
- `impact-detected`: impact and review obligations are known without unresolved structural ambiguity;
- `indeterminate`: at least one finding prevents a complete impact claim.

`summary.ok` means the report contains no `indeterminate` finding. It does not mean that no module is impacted.

## 10. Version semantics

The analyzer MUST NOT automatically choose a patch, minor, or major version increment.

A current-tree path comparison cannot by itself prove:

- behavioral compatibility;
- API compatibility;
- data compatibility;
- migration safety;
- rollback safety;
- correct semantic-version selection.

The `version` review requirement records that a human or separately governed agent must make that decision using contract and test evidence.

## 11. Generated sources

Generated paths may be included as changed files, but absent explicit generator provenance the analyzer MUST preserve uncertainty.

Generated output alone is not sufficient to identify the authoritative source change.

## 12. Determinism

For identical project manifests, module manifests, Git name-status input, and options, a conforming implementation MUST emit deterministically ordered:

- changed files;
- impacted modules;
- evidence;
- review requirements;
- findings.

No generated timestamp is required.

## 13. Non-goals

This profile does not:

- inspect patch hunks or AST-level symbol changes;
- compare old and new manifest semantics;
- prove semantic compatibility;
- select a semantic-version increment;
- edit FMS, SCL, manifests, or source files;
- register or remove modules;
- approve a pull request;
- execute repository code;
- create runtime relations.

## 14. Governance invariant

```text
Observed Git change
  → direct module ownership
  → declared MSSP-VT propagation
  → review obligations
  → independent compatibility and version decision
```

Impact evidence MUST NOT approve the change it describes.
