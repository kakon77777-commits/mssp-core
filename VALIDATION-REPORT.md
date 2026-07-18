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

The Draft PR is validated from a clean checkout of the pull-request merge ref with complete Git history available to the impact analyzer.

```text
npm ci --no-audit --no-fund                              PASS
npm run typecheck                                        PASS
npm test                                                 PASS — 11 test files, 40 tests
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

The Git-diff-impact validation run was GitHub Actions run `29631254627` on head commit `17d0618750f104b0ceef01dde39f3dbd9c7bdffa`.

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

Artifact ID: `8425531388`  
Artifact digest: `sha256:d44cb076ac560c1cb68806408806af5b3e9102821e6c2afa3889c5308c13d70e`

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

## Verified scanner evidence

- Root and nested `.gitignore` files are recorded with their base paths and normalized patterns.
- Ignored files and directories are excluded from inventory and counted.
- npm workspace patterns resolve declared member candidates.
- Workspace evidence strengthens structural confidence without adding an MSSP layer.
- JavaScript/TypeScript relative and workspace imports produce deterministic dependency evidence.
- Explicit JavaScript `.js`, `.mjs`, and `.cjs` paths may resolve to TypeScript `.ts` or `.tsx` source files.
- Python external imports produce external dependency evidence.
- Go extraction reads import statements and import blocks without treating ordinary string literals as imports.
- Rust `crate::`, `self::`, and `super::` roots remain local-looking evidence rather than external-package claims.
- Internal, cross-boundary, workspace, external, and unresolved scopes remain distinguishable.
- Generated source paths are recorded but excluded from static import evidence.
- A bounded scan records `discovery.truncated: true` rather than claiming completeness.

## Verified classification behavior

- Role terminology and dependency topology can reinforce an SMS suggestion.
- Explicit plugin terminology produces a TMS hypothesis while retaining competing SMS evidence.
- Diagnostic terminology produces a DMS hypothesis and asks whether business state is owned.
- Weak package/workspace evidence remains `UNDETERMINED`.
- Repository and source-root aggregate boundaries remain `UNDETERMINED`.
- Supporting evidence, counterevidence, alternatives, and unresolved questions remain separately inspectable.
- `supportScore` remains bounded and is specified as heuristic support rather than probability.
- Truncated scans force all suggestion confidence to `low` and record truncation counterevidence.
- Suggestions do not modify scanner candidates, module declarations, layers, or runtime relations.

## Verified candidate review and promotion behavior

- `approve`, `reject`, and `defer` are represented as explicit, attributable review outcomes.
- `approve` requires an explicitly selected layer rather than silently inheriting the classifier suggestion.
- Approved reviews create a deliberately incomplete contract draft and begin in `blocked` state.
- Deferred and rejected reviews do not create module declarations.
- Stored `promotion.status` is not trusted; blockers are recomputed at manifest emission time.
- Remaining TODO markers block promotion.
- Truncated scans, unresolved review conditions, missing maintainer, missing executable entry, missing TMS activation, missing failure modes, missing validation criteria, and missing tests block promotion.
- Source-bearing candidates cannot be promoted to FMS or SCL through the reference workflow.
- Final approver identity must differ from the classification reviewer.
- A completed contract validates against `module.schema.json` before YAML emission.
- Emitted manifests preserve reviewer, approver, candidate, review, timestamp, rationale, and source-revision provenance under `metadata.promotion`.
- The CLI refuses to overwrite an existing promotion target.
- Promotion does not modify `mssp.yaml`, register a module automatically, create runtime relations, or execute repository code.

## Verified architecture drift behavior

- The canonical reference project produces a schema-valid `consistent` report.
- Canonical FMS identity, module-index, and architecture-notes document presence is checked.
- A Markdown table with `ID` and `Layer` columns is parsed conservatively; unrestricted prose remains `indeterminate`.
- Missing, stale, duplicate, and layer-mismatched FMS module-index rows are reported separately.
- Executable source outside every declared module boundary is reported as unowned drift.
- Executable source covered by nested or overlapping manifests is reported as ambiguous ownership.
- Executable source inside FMS or SCL is an error-severity drift finding.
- Generated-source conventions are excluded from ownership findings.
- Reaching the configured file bound creates `MSSP_DRIFT_009` and an `indeterminate` finding rather than a completeness claim.
- `consistent` means structural consistency only; the report explicitly denies semantic-equivalence and automatic-mutation claims.
- Drift analysis does not repair FMS, mutate manifests, register modules, or create runtime relations.

## Verified Git diff impact behavior

- NUL-delimited Git name-status records and rename records are parsed deterministically.
- Git paths are converted to MSSP-project-relative paths while files wholly outside the project are counted separately.
- Direct changes distinguish module manifests, declared entries, and other files within module boundaries.
- A direct SMS change propagates through `changeImpact.affects`, `changeImpact.affectedBy`, `requires.modules`, and `compatibility.modules`.
- Propagation is transitive and cycle-safe.
- FMS and SCL changes produce explicit review requirements without claiming semantic compatibility.
- Direct module changes require module-contract, version, and test review.
- Transitively impacted modules require compatibility and test review.
- Impacted TMS modules require island-test review.
- Unowned or overlapping executable-layer changes preserve `indeterminate` state.
- Unknown MSSP-VT targets, removed manifest or entry paths, and generated-source provenance gaps preserve `indeterminate` state.
- `impact-detected` means review scope is known; it does not mean incompatibility.
- The analyzer does not select a semantic-version increment, mutate declarations, approve a pull request, or execute repository code.

## Verified architecture boundaries

- Executable source inside FMS is rejected.
- TMS directly depending on another TMS is rejected.
- SMS depending on TMS is rejected.
- Unknown TMS island target is rejected.
- Invalid scanner and drift `maxFiles` values are rejected.
- Dependency, build, cache, and editor output directories are excluded from scanner inventory.
- Scanner candidates contain no MSSP `layer` before classification review.
- Static source references do not become declared runtime `relations` automatically.
- Classification suggestions cannot approve or promote themselves.
- Classification review and final promotion approval are separate roles.
- Drift findings cannot mutate the architecture they describe.
- Impact findings cannot approve, version, or mutate the change they describe.

## Package portability

The package lock contains public `registry.npmjs.org` URLs and no environment-internal package gateway URLs.

## Current open boundaries

- No Tree-sitter or compiler-grade AST dependency analysis.
- No language-specific alias or complete build-graph resolution.
- No complete Git ignore equivalence.
- No generated-source provenance.
- No patch-hunk or symbol-level Git impact analysis.
- No old-versus-new manifest semantic comparison.
- No automatic semantic-version selection.
- No interactive contract-draft editor or automatic condition-resolution ledger.
- No automatic, governed registration of an emitted manifest into `mssp.yaml`.
- No cryptographic review signatures or external identity verification.
- No semantic comparison of FMS narrative prose with implementation behavior.
- No runtime-trace or deployment-topology drift comparison.
- No historical or cross-version drift baseline.
- No semantic ingestion of activation, state ownership, deployment topology, rollback, or historical change data.
- No runtime instrumentation or DMS event transport protocol.
- No visual web editor.
- No AISMBI/MCL implementation.
- No EML adapter implementation yet; only the independent boundary and interchange contracts are specified.
