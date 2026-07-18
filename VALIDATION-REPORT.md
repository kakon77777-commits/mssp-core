# MSSP Core Validation Report

Date: 2026-07-18

## Reference environment

- GitHub-hosted Ubuntu 24.04 runner
- Node.js 22
- TypeScript 5.x
- Vitest 3.x
- Public `registry.npmjs.org` dependency resolution

## Automated checks

The Draft PR is validated from a clean checkout of the pull-request merge ref.

```text
npm ci --no-audit --no-fund                         PASS
npm run typecheck                                   PASS
npm test                                            PASS — 9 test files, 31 tests
npm run build                                       PASS
mssp lint examples/hello-mssp                       PASS
mssp lint examples/hello-mssp --json                PASS
mssp island examples/hello-mssp                     PASS
mssp island examples/hello-mssp --json              PASS
mssp model examples/hello-mssp --revision <sha>     PASS
mssp scan . --revision <sha> --max-files 10000      PASS
mssp classify . --revision <sha> --max-files 10000  PASS
mssp review-candidate . ... --out promotion-review.json PASS
mssp graph examples/hello-mssp                      PASS
validation artifact upload                         PASS
```

The governed promotion-workflow validation run was GitHub Actions run `29630165426` on head commit `aeb4cedcd7472107590e200aa5d065bc7b4bb37b`.

The validated artifact contains:

```text
architecture.mmd
classification-suggestions.json
diagnostics.json
island-diagnostics.json
intermediate-model.json
promotion-review.json
repository-scan.json
```

Artifact ID: `8425189837`  
Artifact digest: `sha256:7493d9222f54f5ecf09e9f72e4d57e8e202e422d782ec0de75524e9da174a636`

## Protocol and model conformance

- Diagnostic Protocol envelopes validate against `schemas/diagnostic.schema.json`.
- Manifest-produced Intermediate Models validate against `schemas/intermediate-model.schema.json`.
- Repository Scanner output validates against the same Intermediate Model schema.
- Classification reports validate against `schemas/classification-suggestions.schema.json`.
- Candidate promotion reviews validate against `schemas/promotion-review.schema.json`.
- Manifest models emit declared `modules` and an empty `candidates` array.
- Scanner models emit unclassified `candidates`, discovery evidence, and no invented MSSP layer assignments.
- Scanner static dependencies remain in `discovery.dependencies`; normative `relations` remain empty.
- Classification reports preserve `mode: advisory`, `autoPromotion: false`, and `status: review-required`.
- Promotion reviews preserve named reviewer identity, rationale, source snapshots, explicit decision, blockers, and `requiresIndependentApproval: true`.
- Model, scanner, classifier, and fixed-input review output are deterministic for identical inputs and options.
- Source references are repository-relative and may include an explicit revision.

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

## Verified architecture boundaries

- Executable source inside FMS is rejected.
- TMS directly depending on another TMS is rejected.
- SMS depending on TMS is rejected.
- Unknown TMS island target is rejected.
- Invalid scanner `maxFiles` values are rejected.
- Dependency, build, cache, and editor output directories are excluded from scanner inventory.
- Scanner candidates contain no MSSP `layer` before classification review.
- Static source references do not become declared runtime `relations` automatically.
- Classification suggestions cannot approve or promote themselves.
- Classification review and final promotion approval are separate roles.

## Package portability

The package lock contains public `registry.npmjs.org` URLs and no environment-internal package gateway URLs.

## Current open boundaries

- No Tree-sitter or compiler-grade AST dependency analysis.
- No language-specific alias or complete build-graph resolution.
- No complete Git ignore equivalence.
- No generated-source provenance.
- No interactive contract-draft editor or automatic condition-resolution ledger.
- No automatic, governed registration of an emitted manifest into `mssp.yaml`.
- No cryptographic review signatures or external identity verification.
- No semantic ingestion of activation, state ownership, deployment topology, rollback, or historical change data.
- No FMS/code drift analysis.
- No Git diff impact inference.
- No runtime instrumentation or DMS event transport protocol.
- No visual web editor.
- No AISMBI/MCL implementation.
- No EML adapter implementation yet; only the independent boundary and interchange contracts are specified.
