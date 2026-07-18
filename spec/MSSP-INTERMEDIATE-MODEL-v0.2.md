# MSSP Intermediate Model v0.2

**Status:** Draft, implemented by MSSP Core  
**Model version:** `0.2`  
**Normative schema:** `schemas/intermediate-model.schema.json`

## 1. Purpose

The MSSP Intermediate Model is the language-neutral exchange representation between source-specific discovery and MSSP analysis.

```text
YAML manifests ─┐
Repository scan ├─> MSSP Intermediate Model ─> validation / graph / diagnostics
EML adapter     ┤                              ├> IDE / Agent
Python adapter  ┤                              └> governance / impact analysis
Rust adapter   ─┘
```

A producer translates source-specific structures into the Intermediate Model. A consumer operates on the model without requiring knowledge of YAML, EML AST nodes, Python packages, Rust crates, Godot scenes, or a particular repository layout.

## 2. Design requirements

An Intermediate Model document MUST be:

- language-neutral;
- independent of absolute local file-system paths;
- deterministic for identical source inputs and options;
- explicit about producer and adapter identity;
- traceable to source declarations or evidence;
- serializable as JSON;
- valid against the normative JSON Schema.

It MUST NOT require a wall-clock generation timestamp. A producer MAY attach a source revision, such as a Git commit SHA, to source references.

## 3. Top-level envelope

```json
{
  "schemaVersion": "0.2",
  "kind": "mssp-intermediate-model",
  "generatedBy": {
    "name": "@evemisslab/mssp-core",
    "version": "0.1.0",
    "adapter": "mssp-manifest"
  },
  "project": {},
  "layers": [],
  "modules": [],
  "relations": [],
  "policies": []
}
```

### `schemaVersion`

Identifies the Intermediate Model contract, not the source manifest version.

### `generatedBy`

Identifies the implementation and adapter that produced the document.

### `project`

Contains normalized project identity and its source reference.

### `layers`

Contains configured MSSP layers and source paths.

### `modules`

Contains normalized module contracts.

### `relations`

Contains explicit graph edges derived from dependency and MSSP-VT declarations.

### `policies`

Contains normalized project-level policies.

## 4. Source references

Every project, layer, module, relation, and policy is traceable through a source reference:

```json
{
  "kind": "manifest",
  "uri": "TMS/uppercase/module.mssp.yaml",
  "format": "yaml",
  "revision": "<optional-source-revision>"
}
```

`uri` SHOULD be repository-relative or otherwise portable. Manifest adapters MUST NOT emit host-specific absolute paths.

Supported source kinds are:

- `manifest`;
- `scanner`;
- `adapter`;
- `generated`.

Future adapters may add evidence from multiple sources without changing the normalized module identity.

## 5. Modules

A normalized module includes:

- identity: `id`, `name`, `version`;
- architecture: `layer`, `purpose`, optional `entry`;
- activation, inputs, and outputs;
- module, tool, and data requirements;
- allowed and forbidden permissions;
- risk level and failure modes;
- validation rules and representative tests;
- MSSP and module compatibility;
- MSSP-VT impact relations;
- maintainer and metadata where declared;
- source reference and evidence.

Array fields are deterministically sorted by the reference manifest adapter. Other adapters MUST document their ordering policy and SHOULD produce deterministic output.

## 6. Relations

The v0.2 relation kinds are:

| Kind | Meaning |
|---|---|
| `requires` | Runtime module dependency |
| `affects` | MSSP-VT declaration that the source module affects the target |
| `affected-by` | MSSP-VT declaration that the source module is affected by the target |

Each relation contains source evidence. Consumers MUST NOT infer that an MSSP-VT relation is a runtime dependency.

## 7. Evidence

Evidence records explain why a normalized statement exists.

```json
{
  "kind": "dependency",
  "message": "plugin.uppercase declares a runtime dependency on core.echo.",
  "source": {
    "kind": "manifest",
    "uri": "TMS/uppercase/module.mssp.yaml",
    "format": "yaml"
  },
  "data": {
    "field": "requires.modules"
  }
}
```

Supported evidence kinds are:

- `declaration`;
- `source`;
- `dependency`;
- `policy`;
- `inference`;
- `test`;
- `other`.

A scanner or AI-assisted classifier MUST use `inference` evidence for non-declared conclusions and SHOULD include machine-readable supporting observations. Confidence scores alone are not evidence.

## 8. Determinism

For identical input and options, a conforming producer SHOULD emit byte-stable JSON after applying the same JSON formatting.

The reference adapter guarantees:

- no generation timestamp;
- repository-relative source URIs;
- sorted modules;
- sorted module arrays;
- sorted compatibility maps;
- sorted relations;
- sorted policies and layers.

A revision changes output only when explicitly supplied.

## 9. CLI

```bash
mssp model .
mssp model . --revision <git-sha>
mssp model . --revision <git-sha> --out mssp-model.json
```

The command exports JSON that validates against `schemas/intermediate-model.schema.json`.

## 10. Consumer boundary

New architecture consumers SHOULD read the Intermediate Model rather than parse source manifests directly.

The reference graph generator already follows this rule:

```text
LoadedProject
    ↓ manifest adapter
MSSP Intermediate Model
    ↓ graph projection
MSSP Graph / Mermaid
```

Future repository scanners and language adapters should output the same model. The validator may continue operating on loaded manifests during the v0.2 migration, but cross-language analysis should converge on the Intermediate Model.

## 11. Compatibility

During `0.x`, fields may evolve with explicit migration notes. The following meanings must not silently change within v0.2:

- `requires` is a runtime module dependency;
- `affects` and `affected-by` are MSSP-VT impact declarations;
- source URIs identify evidence locations, not executable imports;
- `generatedBy.adapter` identifies the producer adapter;
- `schemaVersion` identifies this model contract.

A model consumer MUST reject unsupported major or incompatible schema versions rather than guessing.
