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

The implementation is validated from clean Draft PR merge-ref checkouts.

```text
npm ci --no-audit --no-fund                                      PASS
npm run typecheck                                                PASS
npm test                                                         PASS — 17 test files, 93 tests
npm run build                                                    PASS
mssp adapters and five reference adapters                        PASS
mssp lint and JSON diagnostics                                   PASS
mssp island and JSON report                                      PASS
mssp model / scan / classify / review-candidate                  PASS
mssp drift / impact                                              PASS
mssp route examples/hello-mssp --request ...                     PASS
mssp viz JSON and self-contained HTML                            PASS
mssp graph                                                       PASS
validation artifact upload                                      PASS
```

Dynamic workflow-run and artifact identifiers remain in GitHub Actions and the Draft PR rather than this versioned report.

## Schema conformance

Validated outputs include the Diagnostic Protocol, Intermediate Model, classification, promotion, drift, impact, visualization, Router, and adapter Schemas.

Manifest modules remain separate from scanner and adapter candidates. Scanner dependencies remain evidence rather than normative relations. Classification remains advisory. Promotion requires independent approval. Drift and impact cannot mutate or approve architecture.

## Router Contract Evaluator verification

- Only modules declared as TMS are selectable candidates.
- Explicit targets cannot convert another layer or an unclassified candidate into TMS.
- Requests normalize facts and unique set-like arrays deterministically.
- Facts support string, number, boolean, and null scalar values.
- Descriptive intent does not drive hidden natural-language ranking.
- Exact `==` and `!=` scalar conditions are supported.
- Unmatched conditions reject with `MSSP_ROUTE_002`.
- Unsupported conditions remain indeterminate with `MSSP_ROUTE_003`.
- Inputs, outputs, module dependencies, tools, and data are checked independently.
- Requested operations must be allowed and must not be explicitly denied.
- Passing a permission check does not grant permission.
- Risk order L0 through L4 is enforced.
- Numeric comparator conjunctions are supported conservatively.
- Unsupported ranges remain indeterminate rather than being guessed.
- MSSP and required-module compatibility are checked independently.
- Candidate decisions preserve `eligible`, `rejected`, and `indeterminate`.
- Overall results preserve `selected`, `ambiguous`, `no-match`, and `indeterminate`.
- Multiple eligible TMS modules produce `ambiguous`; no hidden ranking is used.
- CLI status is successful only for `selected`.
- Output is deterministic and does not mutate request or project objects.
- Evaluation does not load, execute, activate, deploy, or register modules.
- `selected` is static eligibility, not SCL approval, permission grant, execution, or runtime compatibility proof.

Every Router Evaluation Report preserves:

```json
{
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
```

## Existing vertical-slice verification

- Repository scanning is bounded, deterministic, and evidence-preserving.
- Classification cannot declare, promote, or approve candidates.
- Promotion recomputes blockers and refuses automatic project registration.
- Architecture drift distinguishes structural consistency from semantic equivalence.
- Git impact identifies review scope without selecting a version or proving incompatibility.
- Visualization keeps modules, candidates, and unresolved references distinct.
- Every visualization projection contains every node exactly once.
- Bounded rendering does not delete hidden model data.
- Five adapters preserve explicit declaration versus candidate authority boundaries.
- Adapter metadata does not grant permissions or architecture authority.
- Adapter translation performs no source-runtime execution or network access.

## Architecture boundaries

```text
Scanner evidence        != architecture declaration
Classification          != promotion
Review approval         != completed contract
Manifest emission       != project registration
Drift consistency       != semantic equivalence
Impact detected         != incompatibility
Router selected         != activated or executed
Permission match        != permission grant
Compatibility satisfied != runtime proof
Visualization           != architecture authority
Adapter metadata        != declaration or authority
```

## Package portability

The package lock uses public `registry.npmjs.org` URLs and no environment-internal package gateway URLs.

## Current open boundaries

- No compiler-grade AST analysis, complete build-graph resolution, Git-ignore equivalence, or generated-source provenance.
- No patch-hunk, symbol-level, old-versus-new semantic impact analysis, or automatic semantic-version selection.
- No automatic governed `mssp.yaml` registration or cryptographic review signatures.
- No historical or runtime deployment-topology drift baseline.
- No DMS runtime event transport or SCL enforcement hook integration.
- No Runtime Execution Plan or module activation implementation.
- No dynamic health, load, cost, preference, or weighted Router ranking.
- No complex condition language or complete ecosystem SemVer interpretation.
- No graph editor, canvas/WebGL virtualization, worker layout, or measured browser performance guarantee.
- No direct live Agent Skill, EML, Godot, Python, or Rust integration; adapters consume versioned semantic exports.
- No AISMBI/MCL implementation.
