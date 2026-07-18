# MSSP Adoption Guide

## Start from the system, not from folders

Before moving code, write three FMS documents:

1. `00_SYSTEM_NARRATIVE.md`: why the system exists and its boundary.
2. `01_MODULE_INDEX.md`: module identity, layer, and responsibility.
3. `02_ARCHITECTURE_NOTES.md`: invariants, decisions, and unresolved tensions.

A new contributor should be able to explain the system after reading FMS for fifteen minutes.

## Discover an existing repository before declaring modules

Run the repository intelligence pipeline before assigning layers:

```text
mssp scan
  → mssp classify
  → mssp review-candidate
  → complete contract draft
  → independent approval
  → mssp promote-candidate
  → register manifest in mssp.yaml
```

`scan` discovers structural and dependency evidence. `classify` produces advisory hypotheses. Neither command declares architecture.

Every candidate decision should be recorded as `approve`, `reject`, or `defer`. An approved candidate still begins with a blocked contract draft. Complete the contract, resolve every review condition, and obtain a final approver who is different from the classification reviewer before emitting a manifest.

Manifest emission does not register the module automatically. Adding the emitted manifest to `mssp.yaml` remains a separate architecture change.

## Check that architecture declarations remain true

Run the structural drift report after module registration and during architecture-changing pull requests:

```bash
mssp drift . --revision HEAD --max-files 50000 --out architecture-drift.json
```

The report compares:

- canonical FMS document presence;
- the `ID` and `Layer` table in `FMS/01_MODULE_INDEX.md`;
- discovered module manifests;
- executable source ownership under configured layer roots.

A clean report means the observed structural contracts are mutually consistent. It does not prove semantic or runtime equivalence.

Treat `indeterminate` findings as unresolved evidence, not as success. Increase the file bound or make FMS records machine-readable before approving an architecture claim.

## Decide SMS conservatively

A module belongs in SMS only when removing it prevents every valid system closure. "Important", "large", and "frequently used" do not automatically mean SMS.

Use the counterfactual test:

> Can a coherent version of the system exist without this capability?

- No: candidate SMS.
- Yes: candidate TMS or domain adapter.

Static dependency centrality supports review but does not answer the counterfactual by itself.

## Define TMS as contracts

A TMS is not merely a plugin folder. It must state:

- activation conditions;
- inputs and outputs;
- SMS, tool, and data requirements;
- allowed and forbidden actions;
- risk level;
- safe failure behavior;
- validation rules;
- representative tests;
- compatibility and impact relations;
- maintainer and promotion provenance.

Any remaining `TODO` blocks governed promotion.

## Add governance

SCL should distinguish:

- build-time configuration;
- startup configuration;
- runtime configuration;
- one-shot operational overrides;
- changes requiring review;
- changes forbidden by architecture.

Keep proposer, classification reviewer, and final approver roles attributable and separated. A classifier or workflow adapter must not approve its own output.

## Make observability mandatory

DMS outputs should include:

- what ran;
- which module and version ran;
- selected route;
- validation result;
- artifact location;
- warnings and remaining limitations.

## Pull-request discipline

Architecture-changing PRs update FMS. Compatibility-changing PRs update MSSP-VT. New TMS modules add island evidence. Candidate promotions retain review and approval provenance. CI runs `mssp lint`, `mssp island`, repository scan, classification, candidate review validation, and `mssp drift`.
