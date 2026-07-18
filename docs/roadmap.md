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

**Status:** In progress.

- [x] Language-neutral MSSP Intermediate Model.
  - deterministic JSON representation;
  - portable source references and optional revision;
  - normalized project, layer, module, policy, dependency, and MSSP-VT data;
  - evidence records and adapter identity;
  - JSON Schema, specification, CLI export, and conformance tests;
  - architecture graph generated from the Intermediate Model.
- [ ] Reverse-discover candidate modules from repositories.
- [ ] Evidence-backed layer classification suggestions.
- [ ] FMS/code consistency checks.
- [ ] Git diff impact analysis using MSSP-VT.
- [x] JSON diagnostic protocol for IDEs and agents.
  - stable `MSSP_*_NNN` codes;
  - v0.1 `legacyCode` migration field;
  - JSON Schema and normative specification;
  - evidence, related-module, location, and suggested-action fields;
  - `lint --json` and `island --json` envelopes.

## v0.3 — Visualization and adapters

- [ ] `mssp-viz` interactive architecture graph.
- [ ] EML adapter.
- [ ] Python, Rust, Godot, and Agent Skill adapters.
- [ ] Source navigation from graph nodes.

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
- [ ] Architecture drift detection.

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
