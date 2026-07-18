# Changelog

## Unreleased — v0.2 groundwork

- Added MSSP Diagnostic Protocol v0.2 envelopes for `lint --json` and `island --json`.
- Added stable public `MSSP_*_NNN` diagnostic codes while preserving v0.1 identifiers in `legacyCode`.
- Added machine-readable diagnostic evidence, related-module, source-location, and suggested-action fields.
- Added `schemas/diagnostic.schema.json`, a normative protocol specification, Traditional Chinese guide, and conformance tests.
- Human-readable CLI output now displays stable public diagnostic codes.
- Added MSSP Intermediate Model v0.2 as the deterministic, language-neutral exchange representation for manifests, scanners, adapters, IDEs, and agents.
- Added `mssp model`, portable source references, normalized modules, explicit dependency and MSSP-VT relations, evidence records, JSON Schema, specification, and conformance tests.
- Added explicit `candidates` and scanner `discovery` data so repository discovery does not masquerade as approved MSSP modules.
- Added the deterministic Repository Scanner through `mssp scan`.
- Added bounded file inventory, source-language statistics, common ecosystem marker detection, structural candidate discovery, and evidence-backed boundary confidence.
- Added root and nested `.gitignore` static evaluation with recorded ignore sources and counts.
- Added npm, pnpm, and Cargo workspace discovery and workspace-backed boundary evidence.
- Added static source-reference extraction for JavaScript/TypeScript, Python, Go, Rust, and GDScript.
- Added `internal`, `cross-boundary`, `workspace`, `external`, and `unresolved` dependency scopes under `discovery.dependencies`.
- Added conservative generated-source recognition; generated files remain in inventory but are excluded from static dependency evidence.
- Scanner dependencies remain separate from normative `relations`; candidates remain `unclassified` and contain no MSSP layer.
- Added Repository Scanner and Intermediate Model specifications, Traditional Chinese guides, conformance tests, and CI artifact output.
- Refactored architecture graph generation to consume the Intermediate Model instead of reading manifest structures directly.
- CI exports the Intermediate Model, repository scan, diagnostics, island report, and architecture graph artifacts.
- Migration: Intermediate Model v0.2 consumers must accept the required top-level `candidates` array; manifest-produced models emit an empty array.
- Migration: scanner consumers should treat `discovery.dependencies` as static evidence, not declared runtime dependencies.
- Migration: JSON diagnostic consumers should read `diagnostics[].code`; the previous internal identifier remains available as `diagnostics[].legacyCode`.

## 0.1.0 — 2026-07-18

- Established the independent MSSP Core boundary.
- Added project and module schemas.
- Added TypeScript CLI: init, lint, explain, graph, island.
- Enforced FMS purity, SMS/TMS dependency direction, cycles, layer placement, entries, and MSSP-VT references.
- Added GitHub CI, PR architecture review, reference project, bilingual documentation, and EML integration boundary.
