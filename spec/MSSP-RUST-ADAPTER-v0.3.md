# MSSP Rust Adapter v0.3

Status: normative for the reference `rust-mssp-export` adapter.

## 1. Purpose

The Rust Adapter translates an explicit, versioned Rust semantic export into MSSP Intermediate Model v0.2.

It provides an interoperability boundary between a Rust-aware exporter and MSSP Core. It is not a Rust parser, Cargo frontend, compiler driver, build system, runtime loader, architecture classifier, or approval mechanism.

## 2. Stable identity

```text
adapter id: rust-mssp-export
CLI aliases: rust, rs
input kind: rust-mssp-export
input schemaVersion: 0.3
output kind: mssp-intermediate-model
output schemaVersion: 0.2
```

## 3. Required invariants

The adapter descriptor MUST preserve:

```json
{
  "deterministic": true,
  "readOnly": true,
  "noExecution": true,
  "noNetwork": true,
  "autoPromotion": false,
  "autoMutation": false
}
```

The adapter MUST NOT:

- execute `cargo`, `rustc`, `rustup`, a linker, a test runner, or a package manager;
- evaluate a build script or procedural macro;
- load, link, or execute a crate;
- inspect a local target directory, Cargo registry, Git checkout, toolchain installation, or environment variable;
- resolve or download dependencies;
- read a `sourceUri` as a local file;
- mutate Rust source, Cargo manifests, MSSP manifests, or project registration;
- classify, approve, promote, register, activate, or load a module.

## 4. Input authority

The input is a semantic export produced by a Rust-aware tool outside MSSP Core. MSSP Core validates the export and translates it; it does not prove that the export is complete, current, compiler-equivalent, or authorized.

Rust metadata is evidence, not architecture authority:

```text
Cargo workspace membership
Cargo package identity
crate identity
library or binary target
entry target
feature selection
edition
rust-version
toolchain channel
target triple
crate type
        !=
MSSP module declaration
```

Only a component containing a complete explicit `declaration` maps to an Intermediate Module.

A component without a declaration MUST remain an `unclassified` candidate, regardless of whether Cargo exposes it as a package, library, binary, service, plugin, procedural macro, build script, example, test, or benchmark.

## 5. Project metadata

The reference adapter MAY preserve these source fields as Intermediate Model project metadata:

| Input field | Output metadata key |
|---|---|
| `workspaceName` | `rustWorkspaceName` |
| `cargoResolver` | `rustCargoResolver` |
| `rustVersion` | `rustVersion` |
| `edition` | `rustEdition` |
| `toolchainChannel` | `rustToolchainChannel` |

These fields do not grant permission to compile, execute, load, or register code.

## 6. Component metadata

Each component MUST provide a stable `cargoIdentity` from the exporting tool. The adapter rejects duplicate component IDs and duplicate Cargo identities.

The reference adapter MAY preserve:

| Input field | Output metadata key |
|---|---|
| `cargoIdentity` | `rustCargoIdentity` |
| `packageName` | `rustPackageName` |
| `crateName` | `rustCrateName` |
| `targetName` | `rustTargetName` |
| `crateRoot` | `rustCrateRoot` |
| `edition` | `rustEdition` |
| `crateTypes` | `rustCrateTypes` |
| `features` | `rustFeatures` |
| `targetTriples` | `rustTargetTriples` |
| `rustKind` | `rustComponentKind` |

Array metadata MUST be deterministic, deduplicated, and lexicographically sorted.

## 7. Component kinds

The input schema recognizes:

```text
workspace
package
crate
library
binary
proc-macro
build-script
example
test
benchmark
service
plugin
other
```

These values describe source-system shape only. They do not select an MSSP layer.

## 8. Module mapping

A complete declaration maps to an Intermediate Module using the shared Declarative Adapter Builder.

The adapter MUST NOT infer or fill missing values for:

- MSSP layer;
- version or compatibility;
- purpose or activation;
- inputs or outputs;
- module, tool, or data requirements;
- permissions;
- risk level;
- failure modes;
- validation obligations;
- tests;
- change-impact declarations.

An incomplete declaration is invalid input. It MUST NOT be downgraded into a completed module contract.

## 9. Candidate mapping

A component without a declaration maps to:

```text
candidate.rust.<component-id>
status: unclassified
autoPromotion: false
```

Default candidate boundaries are conservative:

- workspace -> repository;
- package, crate, library, binary, proc-macro, service, plugin -> package;
- build-script, example, test, benchmark, other -> source-root.

An explicit candidate hint may refine the structural boundary. It still cannot assign an MSSP layer or approve promotion.

## 10. Relations

Normative relations are emitted only from complete declarations:

```text
declaration.requirements.modules     -> requires
declaration.changeImpact.affects     -> affects
declaration.changeImpact.affectedBy  -> affected-by
```

The adapter MUST NOT create normative relations from:

- Cargo dependency tables;
- feature activation;
- `use` statements;
- crate imports;
- workspace membership;
- build scripts;
- procedural macro usage;
- target type;
- naming or directory proximity.

Such information may be represented as source metadata or scanner evidence, but it remains separate from declared architecture.

## 11. Source provenance

All source URIs MUST be repository-relative or portable logical URIs. Absolute POSIX paths and Windows drive paths are rejected.

All emitted sources MUST use:

```json
{
  "kind": "adapter",
  "adapter": "rust-mssp-export"
}
```

A supplied revision is copied as provenance; it is not independently verified by the adapter.

## 12. Determinism and conformance

For identical input and options, serialized output MUST be identical.

The output MUST pass:

- Rust adapter input Schema validation;
- MSSP Intermediate Model Schema validation;
- Adapter descriptor Schema validation;
- Adapter conformance evaluation;
- stable ordering and identity checks.

## 13. Interpretation boundary

A valid adapter output means that a valid export was deterministically translated.

It does not prove:

- Cargo or compiler equivalence;
- successful compilation or linking;
- feature completeness;
- build-script or procedural-macro safety;
- absence of `unsafe` behavior;
- semantic or runtime compatibility;
- SCL approval;
- runtime loading or deployment readiness.
