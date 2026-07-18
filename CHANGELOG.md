# Changelog

## Unreleased — v0.2 groundwork

- Added MSSP Diagnostic Protocol v0.2 envelopes for `lint --json` and `island --json`.
- Added stable public `MSSP_*_NNN` diagnostic codes while preserving v0.1 identifiers in `legacyCode`.
- Added machine-readable diagnostic evidence, related-module, source-location, and suggested-action fields.
- Added `schemas/diagnostic.schema.json`, a normative protocol specification, Traditional Chinese guide, and conformance tests.
- Human-readable CLI output now displays stable public diagnostic codes.
- Added MSSP Intermediate Model v0.2 as the deterministic, language-neutral exchange representation for manifests, scanners, adapters, IDEs, and agents.
- Added `mssp model`, portable source references, normalized modules, explicit dependency and MSSP-VT relations, evidence records, JSON Schema, specification, and conformance tests.
- Refactored architecture graph generation to consume the Intermediate Model instead of reading manifest structures directly.
- CI now exports the Intermediate Model alongside diagnostic and architecture artifacts.
- Migration: JSON diagnostic consumers should read `diagnostics[].code`; the previous internal identifier remains available as `diagnostics[].legacyCode`.

## 0.1.0 — 2026-07-18

- Established the independent MSSP Core boundary.
- Added project and module schemas.
- Added TypeScript CLI: init, lint, explain, graph, island.
- Enforced FMS purity, SMS/TMS dependency direction, cycles, layer placement, entries, and MSSP-VT references.
- Added GitHub CI, PR architecture review, reference project, bilingual documentation, and EML integration boundary.
