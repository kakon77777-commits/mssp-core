# Contributing to MSSP Core

## Architecture-first contribution rule

A pull request that changes system identity, module boundaries, dependency direction, or layer semantics must update the relevant FMS/specification material.

## Local checks

```bash
npm install
npm run typecheck
npm test
npm run build
npm run check:example
```

## Change categories

- Schema-compatible clarification: patch release.
- New optional field or diagnostic: minor release.
- Changed invariant or incompatible schema: new MSSP schema version.

## Safety and governance

Do not let one automated agent propose, apply, verify, and approve a high-risk architecture change without an independent review boundary.
