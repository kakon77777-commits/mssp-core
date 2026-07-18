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

The implementation is validated from clean Draft PR merge-ref checkouts with complete Git history available to the impact analyzer.

```text
npm ci --no-audit --no-fund                                      PASS
npm run typecheck                                                PASS
npm test                                                         PASS — 15 test files, 72 tests
npm run build                                                    PASS
mssp adapters --json --out adapter-descriptors.json              PASS
mssp adapt eml examples/eml-adapter/semantic-export.json ...     PASS
mssp adapt godot examples/godot-adapter/semantic-export.json ... PASS
mssp adapt python examples/python-adapter/semantic-export.json ... PASS
mssp adapt rust examples/rust-adapter/semantic-export.json ...   PASS
mssp lint examples/hello-mssp                                    PASS
mssp lint examples/hello-mssp --json                             PASS
mssp island examples/hello-mssp                                  PASS
mssp island examples/hello-mssp --json                           PASS
mssp model examples/hello-mssp --revision <sha>                  PASS
mssp scan . --revision <sha> --max-files 10000                   PASS
mssp classify . --revision <sha> --max-files 10000               PASS
mssp review-candidate . ... --out promotion-review.json          PASS
mssp drift examples/hello-mssp ... --out architecture-drift.json PASS
mssp impact examples/hello-mssp --base HEAD^1 --head HEAD ...    PASS
mssp viz examples/hello-mssp --format json ...                   PASS
mssp viz examples/hello-mssp --format html ...                   PASS
mssp graph examples/hello-mssp                                   PASS
validation artifact upload                                      PASS
```

Implementation behavior includes real temporary-Git tests for addition and deletion project-boundary transitions. Current workflow-run and artifact identifiers remain attached to GitHub Actions and the Draft PR rather than this versioned report.

## Protocol and model conformance

- Diagnostic Protocol envelopes validate against `schemas/diagnostic.schema.json`.
- Manifest-produced Intermediate Models validate against `schemas/intermediate-model.schema.json`.
- Repository Scanner output validates against the same Intermediate Model schema.
- Classification reports validate against `schemas/classification-suggestions.schema.json`.
- Candidate promotion reviews validate against `schemas/promotion-review.schema.json`.
- Architecture drift reports validate against `schemas/architecture-drift.schema.json`.
- Git diff impact reports validate against `schemas/git-diff-impact.schema.json`.
- Visualization Models validate against `schemas/visualization.schema.json`.
- Adapter descriptors validate against `schemas/adapter-descriptor.schema.json`.
- Adapter conformance reports validate against `schemas/adapter-conformance.schema.json`.
- EML semantic exports validate against `schemas/eml-adapter-input.schema.json`.
- Godot semantic exports validate against `schemas/godot-adapter-input.schema.json`.
- Python semantic exports validate against `schemas/python-adapter-input.schema.json`.
- Rust semantic exports validate against `schemas/rust-adapter-input.schema.json`.
- EML-, Godot-, Python-, and Rust-adapted outputs validate against `schemas/intermediate-model.schema.json`.
- Manifest models emit declared `modules` and an empty `candidates` array.
- Scanner models emit unclassified `candidates`, discovery evidence, and no invented MSSP layer assignments.
- Scanner static dependencies remain in `discovery.dependencies`; normative `relations` remain empty.
- Classification reports preserve `mode: advisory`, `autoPromotion: false`, and `status: review-required`.
- Promotion reviews preserve named reviewer identity, rationale, source snapshots, explicit decision, blockers, and `requiresIndependentApproval: true`.
- Drift reports preserve `mode: static-conservative`, `semanticEquivalence: false`, and `autoMutation: false`.
- Impact reports preserve `mode: static-conservative`, `semanticCompatibility: false`, `autoVersionBump: false`, and `autoMutation: false`.
- Visualization Models preserve `readOnly: true` and `autoMutation: false`.
- Adapter descriptors preserve `deterministic: true`, `readOnly: true`, `noExecution: true`, `noNetwork: true`, `autoPromotion: false`, and `autoMutation: false`.
- Model, scanner, classifier, fixed-input review, drift, impact, visualization, EML adapter, Godot adapter, Python adapter, and Rust adapter output are deterministic for identical inputs and options.
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

## Verified visualization behavior

- Visualization is derived from the Intermediate Model rather than direct project mutation.
- Declared modules, unclassified candidates, and unresolved references remain distinct node kinds.
- Candidates are displayed under `UNCLASSIFIED`; missing relation targets are retained under `UNRESOLVED`.
- `requires`, `affects`, and `affected-by` relations preserve their declared direction.
- JSON output is deterministic for identical input and options.
- HTML output is self-contained and loads no CDN, external script, stylesheet, font, analytics service, or runtime package.
- Search, layer filtering, node inspection, relation drawing, and optional source navigation are available without changing architecture authority.
- Source links preserve repository-relative source identity.
- Visualization cannot classify, promote, approve, register, execute, or mutate the architecture it displays.

## Verified Adapter Contract, Registry, EML, Godot, Python, and Rust behavior

- EML, Godot, Python, and Rust adapter descriptors are schema-valid and advertise fixed read-only, offline, and non-executing invariants.
- The registry emits descriptors in stable adapter-ID order and resolves `eml`, `godot`, `gd`, `python`, `py`, `rust`, and `rs` aliases without ecosystem-specific CLI branches.
- `mssp adapters --json` emits all four machine-readable descriptors through the public CLI.
- `mssp adapt eml` consumes only a versioned `eml-mssp-export` JSON document.
- `mssp adapt godot` consumes only a versioned `godot-mssp-export` JSON document.
- `mssp adapt python` consumes only a versioned `python-mssp-export` JSON document.
- `mssp adapt rust` consumes only a versioned `rust-mssp-export` JSON document.
- Complete explicit declarations map to Intermediate Modules with adapter provenance.
- EML symbols, Godot components, Python components, and Rust components without complete declarations remain `unclassified` candidates even when source metadata describes them as modules, scenes, scripts, autoloads, plugins, packages, commands, services, crates, libraries, binaries, build scripts, or procedural macros.
- Godot engine, renderer, main-scene, scene/script/class/node/resource, autoload, plugin, signal, and group metadata do not grant architecture authority.
- Python import paths and entry points remain metadata and do not grant architecture authority.
- Rust workspace membership, Cargo package/crate identity, targets, features, editions, toolchains, crate types, and target triples remain metadata and do not grant architecture authority.
- Incomplete declarations are rejected rather than completed heuristically.
- Duplicate EML symbol identities are rejected.
- Duplicate Godot component IDs and Godot identities are rejected.
- Duplicate Python component IDs and qualified names are rejected.
- Duplicate Rust component IDs and Cargo identities are rejected.
- Duplicate layer and policy identities are rejected.
- Normative `requires`, `affects`, and `affected-by` relations are emitted only from complete explicit declarations.
- Godot scene inheritance, node ownership, script attachment, signals, groups, autoloads, plugin state, resources, preload/load calls, names, and source proximity do not become normative relations.
- Python imports, distribution dependencies, entry points, decorators, names, and source proximity do not become normative relations.
- Cargo dependency tables, features, `use` statements, crate imports, workspace membership, build scripts, procedural macros, target types, names, and source proximity do not become normative relations.
- Unknown relation targets remain visible rather than being deleted.
- Every emitted source uses `kind: adapter`, identifies the producing adapter, and uses a portable URI.
- Absolute filesystem source paths are rejected.
- A supplied revision is copied to adapter-produced source references.
- Adapter output uses stable lexical ordering and does not mutate its input object.
- The shared Declarative Adapter Builder preserves common module, candidate, relation, provenance, and sorting rules while each ecosystem retains its own input Schema and metadata mapping.
- Conformance evaluation detects invalid descriptor/output schemas, adapter identity mismatch, duplicate or overlapping identities, unstable ordering, and invalid source provenance.
- The EML adapter does not parse raw `.eml`, execute EML, resolve imports, read source-URI targets, invoke Git, invoke a package manager, or access the network.
- The Godot adapter does not launch the editor/runtime/importer/exporter, load scenes/resources/scripts, execute GDScript/C#/GDExtension/tool scripts/plugins, inspect `.godot` state, resolve runtime relations, read source-URI targets, invoke Git, or access the network.
- The Python adapter does not import or execute Python, invoke an interpreter, inspect virtual environments, run package managers or build backends, resolve imports, read source-URI targets, invoke Git, or access the network.
- The Rust adapter does not execute Cargo, rustc, rustup, linkers, build scripts, procedural macros, crates, registries, dependency resolution, source-URI targets, Git, or network access.
- Adapter output represents source declarations only; it does not prove SCL approval, compatibility, registration, runtime loading, or deployment readiness.

## Verified architecture boundaries

- Executable source inside FMS is rejected.
- TMS directly depending on another TMS is rejected.
- SMS depending on TMS is rejected.
- Scanner and adapter candidates contain no layer before governed review.
- Static source references do not become runtime relations automatically.
- Source-language metadata and adapter heuristics do not become module declarations.
- Classification review and final promotion approval are separate roles.
- Drift findings cannot mutate architecture.
- Impact findings cannot approve, version, or mutate changes.
- Visualization cannot mutate or authorize architecture.
- Adapter translation cannot execute source systems, register modules, or grant architecture authority.

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
- No graph editor, architecture mutation UI, large-graph virtualization, or multi-view layout refinement.
- No direct raw-EML parser integration or live EML toolchain bridge; the current adapter consumes a versioned semantic export.
- No direct Godot editor/runtime/importer/resource-graph/live-project integration; the current adapter consumes a versioned semantic export.
- No direct Python AST, packaging-tool, interpreter, or live-environment integration; the current adapter consumes a versioned semantic export.
- No direct Rust compiler, Cargo graph, build-script, procedural-macro, registry, or live-toolchain integration; the current adapter consumes a versioned semantic export.
- No Agent Skill adapter.
- No AISMBI/MCL implementation.
