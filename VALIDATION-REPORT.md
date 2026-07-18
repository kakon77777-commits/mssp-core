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
npm test                                            PASS — 7 test files, 22 tests
npm run build                                       PASS
mssp lint examples/hello-mssp                       PASS
mssp lint examples/hello-mssp --json                PASS
mssp island examples/hello-mssp                     PASS
mssp island examples/hello-mssp --json              PASS
mssp model examples/hello-mssp --revision <sha>     PASS
mssp scan . --revision <sha> --max-files 10000      PASS
mssp graph examples/hello-mssp                      PASS
validation artifact upload                         PASS
```

The final dependency-aware scanner validation run was GitHub Actions run `29628845328` on head commit `9372dd260b6f686b9a9e97b9a67f5fee2fb76a89`.

The validated artifact contains:

```text
architecture.mmd
diagnostics.json
island-diagnostics.json
intermediate-model.json
repository-scan.json
```

Artifact ID: `8424778605`  
Artifact digest: `sha256:f7fd8dae894f76e49f154fca60c93cdcc713ec5555aa647fff657f5da0f61e62`

## Protocol and model conformance

- Diagnostic Protocol envelopes validate against `schemas/diagnostic.schema.json`.
- Manifest-produced Intermediate Models validate against `schemas/intermediate-model.schema.json`.
- Repository Scanner output validates against the same Intermediate Model schema.
- Manifest models emit declared `modules` and an empty `candidates` array.
- Scanner models emit unclassified `candidates`, discovery evidence, and no invented MSSP layer assignments.
- Scanner static dependencies remain in `discovery.dependencies`; normative `relations` remain empty.
- Model and scanner output are deterministic for identical inputs and options.
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

## Verified architecture boundaries

- Executable source inside FMS is rejected.
- TMS directly depending on another TMS is rejected.
- SMS depending on TMS is rejected.
- Unknown TMS island target is rejected.
- Invalid scanner `maxFiles` values are rejected.
- Dependency, build, cache, and editor output directories are excluded from scanner inventory.
- Scanner candidates contain no MSSP `layer` before classification review.
- Static source references do not become declared runtime `relations` automatically.

## Package portability

The package lock contains public `registry.npmjs.org` URLs and no environment-internal package gateway URLs.

## Current open boundaries

- No Tree-sitter or compiler-grade AST dependency analysis.
- No language-specific alias or build-graph resolution.
- No complete Git ignore equivalence.
- No generated-source provenance.
- No evidence-backed automatic MSSP layer classification.
- No candidate-to-module promotion workflow.
- No FMS/code drift analysis.
- No Git diff impact inference.
- No runtime instrumentation or DMS event transport protocol.
- No visual web editor.
- No AISMBI/MCL implementation.
- No EML adapter implementation yet; only the independent boundary and interchange contracts are specified.
