# MSSP Core Validation Report

Date: 2026-07-18

## Reference environment

- GitHub-hosted Ubuntu 24.04 runner
- Node.js 22
- TypeScript 5.x
- Vitest 3.x
- Git 2.54
- Public `registry.npmjs.org` dependency resolution

## Automated checks

The implementation was validated from a clean checkout of the Draft PR merge ref with complete Git history available to the impact analyzer.

```text
npm ci --no-audit --no-fund                              PASS
npm run typecheck                                        PASS
npm test                                                 PASS — 11 test files, 41 tests
npm run build                                            PASS
mssp lint examples/hello-mssp                            PASS
mssp lint examples/hello-mssp --json                     PASS
mssp island examples/hello-mssp                          PASS
mssp island examples/hello-mssp --json                   PASS
mssp model examples/hello-mssp --revision <sha>          PASS
mssp scan . --revision <sha> --max-files 10000           PASS
mssp classify . --revision <sha> --max-files 10000       PASS
mssp review-candidate . ... --out promotion-review.json  PASS
mssp drift examples/hello-mssp ... --out architecture-drift.json PASS
mssp impact examples/hello-mssp --base HEAD^1 --head HEAD ... PASS
mssp graph examples/hello-mssp                           PASS
validation artifact upload                              PASS
```

The implementation validation run was GitHub Actions run `29631332622` on head commit `b7849544f0f4fa1460577b8609f21b118b946df5`.

The validated artifact contains:

```text
architecture-drift.json
architecture.mmd
classification-suggestions.json
diagnostics.json
git-diff-impact.json
island-diagnostics.json
intermediate-model.json
promotion-review.json
repository-scan.json
```

Artifact ID: `8425559962`  
Artifact digest: `sha256:6f0c8a73cf534133b9da922001006d4aa0734fbc1bbf5e38f9a7af4c12ddcefb`

## Protocol and model conformance

- Diagnostic Protocol envelopes validate against `schemas/diagnostic.schema.json`.
- Manifest-produced Intermediate Models validate against `schemas/intermediate-model.schema.json`.
- Repository Scanner output validates against the same Intermediate Model schema.
- Classification reports validate against `schemas/classification-suggestions.schema.json`.
- Candidate promotion reviews validate against `schemas/promotion-review.schema.json`.
- Architecture drift reports validate against `schemas/architecture-drift.schema.json`.
- Git diff impact reports validate against `schemas/git-diff-impact.schema.json`.
- Manifest models emit declared `modules` and an empty `candidates` array.
- Scanner models emit unclassified `candidates`, discovery evidence, and no invented MSSP layer assignments.
- Scanner static dependencies remain in `discovery.dependencies`; normative `relations` remain empty.
- Classification reports preserve `mode: advisory`, `autoPromotion: false`, and `status: review-required`.
- Promotion reviews preserve named reviewer identity, rationale, source snapshots, explicit decision, blockers, and `requiresIndependentApproval: true`.
- Drift reports preserve `mode: static-conservative`, `semanticEquivalence: false`, and `autoMutation: false`.
- Impact reports preserve `mode: static-conservative`, `semanticCompatibility: false`, `autoVersionBump: false`, and `autoMutation: false`.
- Model, scanner, classifier, fixed-input review, drift, and impact output are deterministic for identical inputs and options.
- Source and changed-file references are portable and project-relative where applicable.

## Verified scanner and classification behavior

- Root and nested `.gitignore` files are recorded with normalized patterns.
- npm, pnpm, and Cargo workspace evidence strengthens structural candidates without assigning a layer.
- Static references remain evidence rather than approved runtime relations.
- Generated source remains visible in inventory but is excluded from static import evidence.
- A bounded scan records `discovery.truncated: true` instead of claiming completeness.
- Classification support, counterevidence, alternatives, and unresolved questions remain separately inspectable.
- `supportScore` is heuristic support rather than probability.
- Truncated scans force classification confidence to `low`.
- Suggestions cannot modify candidates, declare modules, assign layers, or approve themselves.

## Verified candidate review and promotion behavior

- `approve`, `reject`, and `defer` are explicit, attributable outcomes.
- Approval requires an explicitly selected layer and begins with an incomplete contract draft.
- Stored readiness is not trusted; blockers are recomputed at manifest emission time.
- TODO values, unresolved conditions, truncated scans, and incomplete executable or validation contracts block promotion.
- Source-bearing candidates cannot be promoted to FMS or SCL through the reference workflow.
- Final approver identity must differ from the classification reviewer.
- Completed contracts validate against `module.schema.json` before YAML emission.
- Emitted manifests preserve review and approval provenance under `metadata.promotion`.
- Promotion refuses overwrite and does not modify `mssp.yaml` or create runtime relations.

## Verified architecture drift behavior

- The canonical reference project produces a schema-valid `consistent` report.
- Canonical FMS identity, module-index, and architecture-notes presence is checked.
- Only a Markdown table with explicit `ID` and `Layer` columns is treated as a machine-readable module index.
- Missing, stale, duplicate, and layer-mismatched index records are reported separately.
- Unowned and overlapping executable-source boundaries are distinguishable.
- Executable source inside FMS or SCL is an error-severity finding.
- Reaching the file bound produces an `indeterminate` finding.
- `consistent` means structural consistency only; semantic and runtime equivalence are denied explicitly.
- Drift findings cannot repair or mutate the architecture they describe.

## Verified Git diff impact behavior

- NUL-delimited Git name-status and rename records are parsed deterministically.
- Git paths are converted to MSSP-project-relative paths; files wholly outside the project are counted separately.
- Additions use `into-project`; deletions use `out-of-project`.
- Renames and copies preserve `within-project`, `into-project`, or `out-of-project` according to old and new path scope.
- Direct changes distinguish module manifests, declared entries, and other files inside module boundaries.
- Direct SMS changes propagate through `changeImpact.affects`, `changeImpact.affectedBy`, `requires.modules`, and `compatibility.modules`.
- Propagation is transitive and cycle-safe.
- FMS and SCL changes create explicit review requirements without claiming semantic compatibility.
- Direct modules require module-contract, version, and test review.
- Transitive modules require compatibility and test review.
- Impacted TMS modules require island-test review.
- Unowned or overlapping executable-layer changes preserve `indeterminate` state.
- Unknown MSSP-VT targets, removed manifest or entry paths, and generated-source provenance gaps preserve `indeterminate` state.
- `impact-detected` means the review scope is known; it does not mean incompatibility.
- The analyzer does not select a semantic-version increment, mutate declarations, approve a pull request, or execute repository code.

## Verified architecture boundaries

- Executable source inside FMS is rejected.
- TMS directly depending on another TMS is rejected.
- SMS depending on TMS is rejected.
- Scanner candidates contain no layer before governed review.
- Static source references do not become runtime relations automatically.
- Classification review and final promotion approval are separate roles.
- Drift findings cannot mutate architecture.
- Impact findings cannot approve, version, or mutate changes.

## Package portability

The package lock contains public `registry.npmjs.org` URLs and no environment-internal package gateway URLs.

## Current open boundaries

- No Tree-sitter or compiler-grade AST dependency analysis.
- No complete language alias or build-graph resolution.
- No complete Git-ignore equivalence.
- No generated-source provenance.
- No patch-hunk or symbol-level Git impact analysis.
- No old-versus-new manifest semantic comparison.
- No automatic semantic-version selection.
- No automatic governed registration of emitted manifests into `mssp.yaml`.
- No cryptographic review signatures or external identity verification.
- No semantic comparison of FMS prose with implementation behavior.
- No runtime-trace or deployment-topology drift comparison.
- No historical or cross-version drift baseline.
- No runtime DMS event transport.
- No visual web editor.
- No AISMBI/MCL implementation.
- No EML adapter implementation yet; only the independent boundary and interchange contracts are specified.
