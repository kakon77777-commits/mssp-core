# MSSP Core Specification v0.1

## 1. Scope

This specification defines the minimum interoperable architecture contract for the Mother-Set and Subset Paradigm.

It standardizes:

- project and module manifests;
- layer identity;
- dependency-direction invariants;
- FMS purity;
- TMS island-testability;
- SCL, DMS, Router, and Runtime roles;
- MSSP-VT compatibility and impact metadata;
- diagnostics and conformance expectations.

It does not standardize a programming language, dependency injection framework, process supervisor, package manager, or AI model.

## 2. Normative layers

### 2.1 FMS — Foundational Mother Set

FMS is the system constitution and architecture index. It contains narrative, indices, diagrams, invariants, and annotations. FMS MUST contain no executable source. A change to system identity, module boundaries, or dependency direction MUST trigger FMS review.

### 2.2 SCL — Setting Contract Layer

SCL declares who may change what, under which conditions, with which approval and activation semantics. Natural-language reminders alone are not enforceable contracts.

### 2.3 SMS — Stable Mother Set

SMS contains capabilities required by every valid system closure. SMS MUST NOT depend on TMS. SMS modules MAY depend on other SMS modules, but cycles MUST be rejected by the conforming validator.

### 2.4 TMS — Task/Temporary Modular Subset

TMS contains optional, replaceable, independently testable capabilities. A TMS MUST declare activation, inputs, outputs, dependencies, permissions, risk, failure modes, validation, tests, compatibility, and impact metadata. In v0.1, a TMS runtime dependency MUST target SMS only.

### 2.5 DMS — Diagnostic Mother Set

DMS observes and explains execution. It SHOULD avoid owning mutable business state and MUST expose evidence rather than an unqualified completion claim.

### 2.6 Router

Router chooses TMS capabilities by reading contracts, task intent, risk, tools, data, and context constraints. Router SHOULD NOT import optional capabilities as hard core dependencies.

### 2.7 Runtime

Runtime executes the plan selected under MSSP contracts. It MUST reject undeclared modules and SHOULD emit DMS-consumable events.

## 3. Module identity

Every module has a globally unique `id`, a `version`, a `layer`, a human-readable purpose, and a contract. File-system location MUST agree with the declared layer path.

## 4. Dependency direction

The v0.1 executable dependency policy is:

```text
SMS     -> SMS
TMS     -> SMS
DMS     -> SMS
Router  -> SMS
Runtime -> SMS, Router
FMS/SCL -> no executable dependency
```

TMS-to-TMS coordination is expressed through Router or Runtime orchestration, not direct imports.

## 5. Island conformance

A TMS is island-testable when it can be loaded with only:

```text
minimal Runtime + declared SMS dependencies + mocked external tools/data
```

The island test checks dependency closure, activation declaration, validation, representative tests, and failure-mode declaration.

## 6. MSSP-VT

MSSP-VT v0.1 uses:

- semantic or project-defined module `version`;
- `compatibility.mssp`;
- optional dependency version ranges in `compatibility.modules`;
- `changeImpact.affects`;
- `changeImpact.affectedBy`;
- optional impact notes.

These fields provide function/module-level impact navigation before later AI-assisted inference.

## 7. Diagnostics

A conforming validator emits stable diagnostic codes with severity, message, and optional file/module identity. Invalid architecture MUST fail loudly; it MUST NOT be silently repaired by changing layer declarations.

## 8. Conformance levels

- **MSSP-Documented**: FMS and module contracts exist.
- **MSSP-Validated**: schemas and dependency invariants pass.
- **MSSP-Isolated**: every TMS passes island checks.
- **MSSP-Governed**: SCL, PR review, and permission boundaries are enforced.
- **MSSP-Observable**: DMS produces verifiable execution evidence.

The MVP CLI directly validates the first three levels and provides repository templates for the fourth.
