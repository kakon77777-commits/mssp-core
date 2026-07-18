# MSSP Candidate Review and Promotion Protocol v0.2

Status: Draft normative specification  
Protocol version: `0.2`

## 1. Purpose

The Candidate Review and Promotion Protocol converts repository-discovery evidence into a governed module-declaration workflow without allowing a scanner, classifier, or workflow adapter to declare architecture by itself.

The protocol separates five events:

```text
Candidate discovery
  -> advisory classification
  -> explicit review decision
  -> completed module contract
  -> independent final approval
  -> manifest emission
```

A promotion is not valid merely because a classifier produced a high-confidence suggestion.

## 2. Normative language

The terms MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY are normative.

## 3. Artifacts

### 3.1 Classification suggestion

The source suggestion MUST conform to `MSSP-CLASSIFICATION-SUGGESTIONS-v0.2.md` and MUST remain advisory.

### 3.2 Promotion review

A review record MUST have:

- `schemaVersion: "0.2"`;
- `kind: "mssp-candidate-promotion-review"`;
- an immutable candidate snapshot;
- the classification suggestion that was reviewed;
- a named reviewer actor;
- an explicit `approve`, `reject`, or `defer` outcome;
- a rationale;
- unresolved conditions;
- promotion blockers;
- `requiresIndependentApproval: true`.

The JSON representation MUST validate against `schemas/promotion-review.schema.json`.

### 3.3 Contract draft

An `approve` review MUST select an MSSP layer explicitly. It MUST NOT silently inherit the classifier's suggested layer.

An approved review MAY contain a module contract draft. The reference implementation creates a deliberately incomplete draft containing `TODO` markers. The draft is not a declared module and MUST NOT be added to the Intermediate Model `modules` array.

A `reject` or `defer` review MUST NOT be interpreted as a module declaration.

## 4. Actor separation

The following roles are distinct:

- classifier or proposer;
- classification reviewer;
- final approver.

The classifier MUST NOT review its own suggestion. The classification reviewer MUST NOT give final approval to the same promotion. A workflow adapter MUST NOT approve its own generated artifact.

This protocol does not require all three actors to be human. It requires attributable identity and role separation.

## 5. Review decisions

### 5.1 Approve

`approve` means that a reviewer accepts a selected layer as the basis for contract completion. It does not mean that the candidate is already promoted.

An approve decision MUST include `selectedLayer`.

### 5.2 Reject

`reject` means that the candidate MUST NOT be promoted under the reviewed proposal. A later review MAY reconsider the candidate using new evidence.

### 5.3 Defer

`defer` means that evidence, ownership, activation semantics, or system-boundary information is incomplete. A deferred review is not a negative classification.

## 6. Promotion blockers

The reference implementation recomputes blockers at promotion time. Stored readiness fields are evidence, not authority.

Promotion MUST fail when any of the following applies:

- review outcome is not `approve`;
- selected layer is absent;
- module contract draft is absent;
- module contract fails `module.schema.json`;
- draft layer differs from the reviewed selected layer;
- any `TODO` placeholder remains;
- the source scan was truncated;
- review conditions remain unresolved;
- maintainer is absent;
- an executable layer has no entry path;
- a TMS has no activation condition;
- failure modes, validation criteria, or representative tests are absent;
- an FMS or SCL promotion contains an executable source-bearing candidate;
- final approver is the same actor as the classification reviewer.

Implementations MAY add stricter project policy blockers but MUST expose them explicitly.

## 7. Manifest emission

`mssp promote-candidate` emits one YAML module manifest to an explicit output path.

The reference implementation:

- MUST validate the review artifact;
- MUST recompute blockers;
- MUST require an independently identified approver and approval rationale;
- MUST validate the completed contract against `module.schema.json`;
- MUST attach review and approval provenance under `metadata.promotion`;
- MUST refuse to overwrite an existing output file;
- MUST NOT modify `mssp.yaml`;
- MUST NOT add the manifest to a layer directory automatically;
- MUST NOT execute repository code.

Registration in the project manifest remains a separate architecture change subject to ordinary MSSP validation and review.

## 8. Provenance

A promoted manifest SHOULD preserve:

- review ID;
- source candidate ID and path;
- reviewer identity and actor kind;
- final approver identity and actor kind;
- approval timestamp and rationale;
- source revision when available.

## 9. Security boundary

The promotion workflow operates on static repository evidence and explicit review artifacts. It MUST NOT:

- infer consent from a classifier score;
- treat `supportScore` as probability;
- execute candidate source code;
- write outside the explicit output path;
- overwrite an existing manifest;
- create runtime dependency relations automatically;
- bypass FMS, SCL, MSSP-VT, lint, or island-test review.

## 10. Reference CLI

Create a review record:

```bash
mssp review-candidate . \
  --candidate packages/exporter \
  --decision approve \
  --layer TMS \
  --reviewer architecture-reviewer \
  --rationale "The capability is optional and independently activated." \
  --out exporter-review.json
```

After completing the contract draft and resolving every condition, emit a manifest with an independent approver:

```bash
mssp promote-candidate exporter-review.json \
  --approver release-approver \
  --approval-rationale "Contract, validation, and tests are complete." \
  --out TMS/exporter/module.yaml
```

The second command MUST fail while blockers remain.

## 11. Non-goals

Version 0.2 does not:

- edit the contract draft interactively;
- register the promoted module in `mssp.yaml`;
- infer deployment topology or state ownership;
- prove that the selected layer is philosophically correct;
- replace architecture review;
- provide cryptographic signatures or external identity verification.
