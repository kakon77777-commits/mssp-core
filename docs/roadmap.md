# MSSP Core Roadmap

## v0.1 — Architecture contract MVP

- [x] YAML schemas.
- [x] TypeScript loader and validator.
- [x] FMS purity rule.
- [x] Layer dependency rules.
- [x] TMS island tests.
- [x] Mermaid/JSON graph.
- [x] Init template.
- [x] GitHub CI and PR review template.
- [x] Reference project.

## v0.2 — Repository architecture intelligence

**Status:** Core vertical slices complete; compiler-grade refinement remains optional follow-up work.

- [x] Language-neutral MSSP Intermediate Model.
  - deterministic JSON representation;
  - portable source references and optional revision;
  - normalized project, layer, module, policy, dependency, and MSSP-VT data;
  - explicit separation between declared modules and unclassified candidates;
  - evidence records and adapter identity;
  - JSON Schema, specification, CLI export, and conformance tests;
  - architecture graph generated from the Intermediate Model.
- [x] Repository Scanner foundation.
  - deterministic bounded file inventory;
  - source-language inventory;
  - Node, Python, Rust, Go, Godot, JVM, and .NET project markers;
  - repository, package, source-root, and directory candidates;
  - evidence-backed structural boundary confidence;
  - no automatic SMS/TMS classification;
  - `mssp scan` Intermediate Model output and CI artifact.
- [x] Static dependency-aware boundary refinement.
  - root and nested `.gitignore` static evaluation;
  - npm, pnpm, and Cargo workspace declarations;
  - workspace-member boundary strengthening;
  - JavaScript/TypeScript, Python, Go, Rust, and GDScript static reference extraction;
  - internal, cross-boundary, workspace, external, and unresolved dependency scopes;
  - conservative generated-source recognition and exclusion from import evidence;
  - dependency evidence remains separate from declared runtime relations.
- [ ] Compiler-grade dependency refinement.
  - Tree-sitter or compiler AST extraction;
  - language-specific aliases and build configuration;
  - complete Git ignore equivalence;
  - generated-source provenance.
- [x] Evidence-backed layer classification suggestions.
  - deterministic advisory rule engine;
  - FMS, SCL, SMS, TMS, DMS, Router, Runtime, and `UNDETERMINED` hypotheses;
  - support score, confidence band, alternative layers, counterevidence, and unresolved questions;
  - aggregate repository/source-root exclusion;
  - truncated-scan confidence downgrade;
  - independent JSON Schema and normative specification;
  - `mssp classify` read-only CLI and CI artifact;
  - `autoPromotion: false` and `review-required` invariants.
- [x] Candidate-to-module review and promotion workflow.
  - explicit `approve`, `reject`, and `defer` review records;
  - reviewer identity, rationale, conditions, and candidate/classification snapshots;
  - deliberately blocked contract drafts with visible TODO obligations;
  - promotion blockers recomputed at emission time;
  - independent final approver separation;
  - module Schema validation and provenance metadata;
  - explicit output path with overwrite refusal;
  - no automatic `mssp.yaml` registration or runtime relation creation;
  - `mssp review-candidate` and `mssp promote-candidate` CLI commands;
  - JSON Schema, normative specification, Traditional Chinese guide, tests, and CI artifact.
- [x] FMS/code consistency and structural drift checks.
  - canonical FMS document presence;
  - conservative Markdown `ID`/`Layer` module-index parsing;
  - missing, stale, duplicate, and layer-mismatched FMS index records;
  - bounded executable-source inventory under configured layer roots;
  - unowned and overlapping module-boundary findings;
  - executable-source rejection evidence for FMS and SCL;
  - explicit `drift` versus `indeterminate` states;
  - `semanticEquivalence: false` and `autoMutation: false` invariants;
  - stable `MSSP_DRIFT_001` through `MSSP_DRIFT_010` codes;
  - `mssp drift`, JSON Schema, normative specification, Traditional Chinese guide, tests, and CI artifact.
- [x] Git diff impact analysis using MSSP-VT.
  - direct Git name-status comparison with rename detection;
  - project-relative path normalization and cross-boundary transition records;
  - direct module ownership for manifest, entry, and source changes;
  - transitive propagation through `affects`, `affectedBy`, `requires`, and compatibility relations;
  - FMS, SCL, module-contract, version, compatibility, test, and island review obligations;
  - unowned, overlapping, stale-target, deleted-entry, and generated-source uncertainty findings;
  - explicit `semanticCompatibility: false`, `autoVersionBump: false`, and `autoMutation: false` invariants;
  - stable `MSSP_IMPACT_*` codes;
  - `mssp impact`, JSON Schema, normative specification, Traditional Chinese guide, tests, and CI artifact.
- [x] JSON diagnostic protocol for IDEs and agents.
  - stable `MSSP_*_NNN` codes;
  - v0.1 `legacyCode` migration field;
  - JSON Schema and normative specification;
  - evidence, related-module, location, and suggested-action fields;
  - `lint --json` and `island --json` envelopes.

## v0.3 — Visualization and adapters

**Status:** Visualization, Adapter Contract, EML Adapter, and Python Adapter complete; additional ecosystem adapters remain.

- [x] `mssp-viz` interactive architecture graph foundation.
  - deterministic Visualization Model v0.3;
  - declared module, unclassified candidate, and unresolved-reference nodes;
  - `requires`, `affects`, and `affected-by` relations;
  - self-contained HTML with no external runtime dependency;
  - search, layer filters, node details, and responsive relation drawing;
  - JSON Schema, specification, Traditional Chinese guide, tests, and CI artifacts;
  - fixed `readOnly: true` and `autoMutation: false` invariants.
- [x] Source navigation from graph nodes.
  - repository-relative `sourceUri` preservation;
  - optional `--source-base` links;
  - source navigation does not alter architecture authority.
- [x] Adapter Contract v0.3.
  - machine-readable adapter descriptors and conformance reports;
  - deterministic, read-only, offline, non-executing adapter invariants;
  - portable adapter provenance on all emitted sources;
  - explicit module/candidate authority separation;
  - public TypeScript APIs and `mssp adapters` discovery command;
  - JSON Schemas, normative specification, tests, and CI artifacts.
- [x] Declarative Adapter Builder and Registry.
  - shared explicit-declaration, candidate, relation, provenance, and sorting logic;
  - stable alias resolution and descriptor discovery;
  - ecosystem adapters retain their own input schema and metadata mapping;
  - no classification, execution, network access, promotion, or mutation authority.
- [x] EML adapter.
  - versioned `eml-mssp-export` semantic-export input;
  - `mssp adapt eml` CLI;
  - complete explicit declarations mapped to modules;
  - undeclared EML symbols preserved as unclassified candidates;
  - normative relations emitted only from explicit declarations;
  - no raw EML parsing, EML execution, network, source mutation, or project registration;
  - reference fixture, specification, Traditional Chinese guide, tests, and CI artifact.
- [x] Python adapter.
  - versioned `python-mssp-export` semantic-export input;
  - `mssp adapt python` and `mssp adapt py` aliases;
  - Python distribution, interpreter requirement, build backend, qualified name, import path, and entry-point metadata preservation;
  - complete explicit declarations mapped to modules;
  - undeclared packages, plugins, commands, modules, and services preserved as unclassified candidates;
  - duplicate component and qualified-name rejection;
  - normative relations emitted only from explicit declarations;
  - no Python import, execution, interpreter, virtual-environment, package-manager, build-backend, network, source mutation, or project registration;
  - reference fixture, JSON Schema, normative specification, Traditional Chinese guide, tests, and CI artifact.
- [ ] Rust adapter.
- [ ] Godot adapter.
- [ ] Agent Skill adapter.
- [ ] Multi-view layout and large-graph performance refinement.

## v0.4 — Runtime governance

- [ ] Router contract evaluator.
- [ ] DMS trace protocol.
- [ ] SCL enforcement hooks.
- [ ] Risk-aware execution policy.
- [ ] Snapshot and migration contracts.

## v0.5 — Methodology formalization

- [ ] System-boundary decision procedure.
- [ ] SMS/TMS classification procedure.
- [ ] Promotion and demotion rules.
- [ ] Architecture anti-pattern catalogue.
- [ ] Classification dispute and review process.

## v0.6 — Generality validation

- [ ] Heterogeneous reference cases.
- [ ] Third-party adoption cases.
- [ ] Profiles and explicit non-applicability boundaries.

## v0.7 — Scale and evolution

- [ ] Nested MSSP.
- [ ] Multi-repository identity and ownership.
- [ ] Module lifecycle and migration graph.
- [ ] Historical and cross-version architecture drift baselines.

## v0.8 — Multi-subject and AI governance

- [ ] Role separation for proposal, execution, validation, review, and approval.
- [ ] Agent authority and memory/write-scope contracts.
- [ ] Evidence-backed AI classification governance.

## v0.9 — Specification freeze

- [ ] Core terminology and schema release candidate.
- [ ] Stable diagnostic-code registry.
- [ ] Implementation-neutral conformance suite.
- [ ] Independent non-TypeScript implementation.
- [ ] Security and threat model.

## v1.0 — Stable interoperable standard

- [ ] Stable methodology and compatibility commitment.
- [ ] Reference implementation plus independent implementation.
- [ ] Cross-language adapters and conformance fixtures.
- [ ] Governed, observable, and evolvable system contracts.

## Research modules

- MSSP-AISMBI memory-bound inference and MCL.
- AI-generated test scenarios.
- Contract confidence and counterexample feedback.
- Cross-project architecture pattern library.

Research modules do not block stable Core releases.
