# GitHub Publication and Release Checklist

Canonical repository:

```text
https://github.com/kakon77777-commits/mssp-core
```

The initial MSSP Core v0.1.0 source tree is introduced through draft pull request #1 rather than being written directly to `main`.

## Before merging the initial pull request

```text
[ ] MSSP Core CI is green.
[ ] The public npm lockfile is portable.
[ ] FMS/SMS/TMS dependency invariants are reviewed.
[ ] The reference TMS passes its island test.
[ ] The Mermaid architecture artifact is generated.
[ ] README, specification, adoption guide, and known boundaries are accurate.
```

## Recommended repository description

```text
MSSP Core — language-agnostic architecture manifests, validation, dependency graphs, island tests, and governance for the Mother-Set and Subset Paradigm.
```

## Recommended topics

```text
mssp software-architecture modularity agent-architecture typescript architecture-as-code fms sms tms
```

## Clone and validate

```bash
git clone https://github.com/kakon77777-commits/mssp-core.git
cd mssp-core
npm ci --no-audit --no-fund
npm run typecheck
npm test
npm run build
npm run check:example
```

## Initial release sequence

1. Review and merge pull request #1.
2. Confirm CI on `main`.
3. Create the `v0.1.0` Git tag and GitHub release.
4. Attach the architecture artifact or regenerate it from `mssp graph`.
5. Publish the npm package only after the package name and registry ownership are confirmed.
