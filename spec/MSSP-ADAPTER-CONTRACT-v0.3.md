# MSSP Adapter Contract v0.3

**Status:** Normative interoperability specification  
**Output target:** MSSP Intermediate Model v0.2

## 1. Purpose

The Adapter Contract defines how an external language, repository model, editor, agent, or runtime export may be translated into the MSSP Intermediate Model without importing that system into MSSP Core.

An adapter is a boundary translator. It is not an architecture authority, parser host, package installer, runtime executor, classifier, reviewer, or promotion service.

## 2. Required artifacts

A conforming adapter MUST provide:

1. a descriptor conforming to `schemas/adapter-descriptor.schema.json`;
2. a versioned and machine-readable input contract;
3. deterministic translation into `mssp-intermediate-model` v0.2;
4. adapter provenance on every emitted source reference;
5. conformance evaluation using `mssp-adapter-conformance` v0.3;
6. tests showing that the input is not mutated.

## 3. Descriptor

The descriptor kind is:

```json
{
  "schemaVersion": "0.3",
  "kind": "mssp-adapter-descriptor"
}
```

It declares:

- stable adapter identity and version;
- source ecosystem;
- input kind, version, and serialization format;
- output kind and Intermediate Model version;
- supported output capabilities;
- mandatory safety and governance invariants.

The descriptor does not grant authority to the adapter. It only describes the translation implementation.

## 4. Mandatory invariants

Every conforming descriptor MUST contain:

```json
{
  "invariants": {
    "deterministic": true,
    "readOnly": true,
    "noExecution": true,
    "noNetwork": true,
    "autoPromotion": false,
    "autoMutation": false
  }
}
```

These values are constants, not configurable preferences.

### 4.1 Deterministic

Identical normalized input and options MUST produce byte-equivalent JSON after ordinary `JSON.stringify` serialization.

Modules, candidates, layers, policies, and relations MUST use stable lexical ordering. Duplicate identities MUST be rejected or represented as explicit conformance failures.

### 4.2 Read-only

The adapter MUST NOT modify source files, project manifests, FMS records, SCL records, module manifests, editor state, or the input object.

### 4.3 No execution

The adapter MUST NOT execute source programs, build scripts, package-manager hooks, plugins, generated code, macros, or repository commands.

### 4.4 No network

The adapter MUST NOT retrieve dependencies, schemas, source files, metadata, or remote services while adapting input.

### 4.5 No automatic promotion

An adapter MUST NOT infer that a discovered source entity is an approved MSSP module. Only an explicit and complete declaration supplied by the source contract may be represented as a declared module.

All other possible boundaries MUST remain `unclassified` candidates or be omitted with explicit evidence.

### 4.6 No mutation

Adapter output is an exchange representation. Emitting an Intermediate Model MUST NOT register modules, create runtime relations in a project, approve architecture, or update `mssp.yaml`.

## 5. Source provenance

Every source reference emitted by an adapter MUST use:

```json
{
  "kind": "adapter",
  "adapter": "<descriptor.id>",
  "uri": "portable/source/identity"
}
```

Source identities MUST be portable. Absolute POSIX paths, Windows drive paths, and backslashes are non-conformant.

A supplied revision MAY be copied to all emitted source references. The revision records source identity; it does not prove reproducible execution or semantic equivalence.

## 6. Output authority

The Intermediate Model separates representation from authority.

```text
explicit complete source declaration -> module representation
source entity without declaration    -> unclassified candidate
adapter heuristic                     -> never a module declaration
```

A module emitted by an adapter means only that the source export explicitly supplied a complete declaration. Downstream MSSP validation and SCL governance still determine whether that declaration is allowed, registered, compatible, or deployable.

## 7. Relations

Normative `requires`, `affects`, and `affected-by` relations MAY be emitted only from explicit source declarations.

Static imports, calls, symbol references, embeddings, or similarity evidence MUST NOT silently become normative MSSP relations. Such evidence belongs in scanner discovery or another explicitly non-normative evidence channel.

Unknown relation targets MUST remain visible. An adapter MUST NOT delete a declared relation merely because the target is absent from the same export.

## 8. Conformance report

The conformance report kind is:

```json
{
  "schemaVersion": "0.3",
  "kind": "mssp-adapter-conformance",
  "adapter": "adapter.id",
  "ok": true,
  "issues": []
}
```

It MUST conform to `schemas/adapter-conformance.schema.json`.

At minimum, evaluation MUST check:

- descriptor schema validity;
- Intermediate Model schema validity;
- `generatedBy.adapter` identity;
- stable ordering;
- duplicate module, candidate, relation, layer, and policy identities;
- module/candidate identity overlap;
- adapter source kind and adapter identity;
- portable source URIs.

A non-conformant model MUST NOT be returned by the reference `runAdapter` API.

## 9. Public reference API

```ts
interface MsspAdapter<Input> {
  descriptor: MsspAdapterDescriptor;
  adapt(input: Input, options?: MsspAdapterOptions): MsspIntermediateModel;
}
```

`runAdapter` validates the descriptor, runs the translator, evaluates output conformance, and rejects non-conformant output.

`evaluateAdapterConformance` is available for IDEs, agents, tests, and independent adapter implementations.

## 10. CLI discovery

The reference CLI exposes adapter descriptors through:

```bash
mssp adapters --json
```

Adapter execution uses:

```bash
mssp adapt <adapter> <versioned-export.json> --out intermediate-model.json
```

The CLI reads an existing export. It does not launch the source language parser or runtime.

## 11. Versioning

Adapter descriptor version, input schema version, Adapter Contract version, and Intermediate Model version are independent.

A breaking input change requires an input schema-version change. A changed translation policy requires an adapter-version change. A future Intermediate Model version requires an explicit descriptor output update.

## 12. Non-goals

Adapter Contract v0.3 does not define:

- source-language syntax;
- parser APIs;
- compiler plugin loading;
- package discovery;
- network transport;
- automatic layer classification;
- review or approval;
- project registration;
- runtime trace ingestion;
- semantic compatibility proof.
