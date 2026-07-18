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
npm test                                            PASS — 7 test files, 18 tests
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

The validated artifact contains:

```text
architecture.mmd
diagnostics.json
island-diagnostics.json
intermediate-model.json
repository-scan.json
```

The first complete Repository Scanner validation run was GitHub Actions run `29628387210` on head commit `c26c7a1bcb8a262594f2263f4613bcd4b72af4bf`.

## Protocol and model conformance

- Diagnostic Protocol envelopes validate against `schemas/diagnostic.schema.json`.
- Manifest-produced Intermediate Models validate against `schemas/intermediate-model.schema.json`.
- Repository Scanner output validates against the same Intermediate Model schema.
- Manifest models emit declared `modules` and an empty `candidates` array.
- Scanner models emit unclassified `candidates`, discovery evidence, and no invented MSSP layer assignments.
- Model and scanner output are deterministic for identical inputs and options.
- Source references are repository-relative and may include an explicit revision.

## Verified negative and boundary cases

- Executable source inside FMS is rejected.
- TMS directly depending on another TMS is rejected.
- SMS depending on TMS is rejected.
- Unknown TMS island target is rejected.
- Invalid scanner `maxFiles` values are rejected.
- Dependency, build, cache, and editor output directories are excluded from scanner inventory.
- A bounded scan records `discovery.truncated: true` rather than claiming completeness.
- Scanner candidates contain no MSSP `layer` before classification review.

## Package portability

The package lock contains public `registry.npmjs.org` URLs and no environment-internal package gateway URLs.

## Current open boundaries

- No AST/import dependency analysis.
- No `.gitignore` semantic evaluation.
- No evidence-backed automatic MSSP layer classification.
- No candidate-to-module promotion workflow.
- No FMS/code drift analysis.
- No Git diff impact inference.
- No runtime instrumentation or DMS event transport protocol.
- No visual web editor.
- No AISMBI/MCL implementation.
- No EML adapter implementation yet; only the independent boundary and interchange contracts are specified.
