# MSSP Adoption Guide

## Start from the system, not from folders

Before moving code, write three FMS documents:

1. `00_SYSTEM_NARRATIVE.md`: why the system exists and its boundary.
2. `01_MODULE_INDEX.md`: module identity, layer, and responsibility.
3. `02_ARCHITECTURE_NOTES.md`: invariants, decisions, and unresolved tensions.

A new contributor should be able to explain the system after reading FMS for fifteen minutes.

## Decide SMS conservatively

A module belongs in SMS only when removing it prevents every valid system closure. "Important", "large", and "frequently used" do not automatically mean SMS.

Use the counterfactual test:

> Can a coherent version of the system exist without this capability?

- No: candidate SMS.
- Yes: candidate TMS or domain adapter.

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
- compatibility and impact relations.

## Add governance

SCL should distinguish:

- build-time configuration;
- startup configuration;
- runtime configuration;
- one-shot operational overrides;
- changes requiring review;
- changes forbidden by architecture.

## Make observability mandatory

DMS outputs should include:

- what ran;
- which module and version ran;
- selected route;
- validation result;
- artifact location;
- warnings and remaining limitations.

## Pull-request discipline

Architecture-changing PRs update FMS. Compatibility-changing PRs update MSSP-VT. New TMS modules add island evidence. CI runs `mssp lint` and `mssp island`.
