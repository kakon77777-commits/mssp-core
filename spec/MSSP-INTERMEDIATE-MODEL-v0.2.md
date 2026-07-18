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

The model distinguishes two architectural states:

- **declared modules**, which already have an MSSP layer and contract;
- **unclassified candidates**, which have structural evidence but no approved MSSP layer.

This distinction prevents repository discovery from being mistaken for architecture classification.

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
  "candidates": [],
  "relations": [],
  "policies": []
}
```

A repository scanner MAY also include:

```json
{
  "discovery": {
    "root": ".",
    "truncated": false,
    "ignoredDirectories": [],
    "inventory": {
      "files": 0,
      "sourceFiles": 0,
      "languages": []
    },
    "markers": []
  }
}
```

### `schemaVersion`

Identifies the Intermediate Model contract, not the source manifest version.

### `generatedBy`

Identifies the implementation and adapter that produced the document.

### `project`

Contains normalized or inferred project identity and its source reference.

### `layers`

Contains configured MSSP layers and source paths. An unclassified repository scan may leave this empty.

### `modules`

Contains approved, normalized MSSP module contracts. Every module has a valid MSSP layer.

### `candidates`

Contains discovered structural boundaries that have not yet been classified as MSSP modules.

### `relations`

Contains explicit graph edges derived from dependency and MSSP-VT declarations. A scanner MUST NOT invent relations without evidence.

### `policies`

Contains normalized project-level policies.

### `discovery`

Contains optional scanner inventory and marker information. Manifest-only producers may omit it.

## 4. Source references

Every project, layer, module, candidate, relation, and policy is traceable through a source reference:

```json
{
  "kind": "manifest",
  "uri": "TMS/uppercase/module.mssp.yaml",
  "format": "yaml",
  "revision": "<optional-source-revision>"
}
```

`uri` SHOULD be repository-relative or otherwise portable. Producers MUST NOT emit host-specific absolute paths when a portable path is available.

Supported source kinds are:

- `manifest`;
- `scanner`;
- `adapter`;
- `generated`.

Future adapters may attach evidence from multiple sources without changing normalized identity.

## 5. Declared modules

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

## 6. Unclassified candidates

A candidate represents evidence of a possible architectural boundary before classification review.

```json
{
  "id": "candidate.packages.export-pdf",
  "name": "export-pdf",
  "path": "packages/export-pdf",
  "boundaryKind": "package",
  "boundaryConfidence": 0.95,
  "status": "unclassified",
  "fileCount": 12,
  "sourceFileCount": 8,
  "languages": ["typescript"],
  "source": {
    "kind": "scanner",
    "uri": "packages/export-pdf",
    "format": "directory",
    "adapter": "repository-scanner"
  },
  "evidence": []
}
```

Candidate boundary kinds are:

| Kind | Meaning |
|---|---|
| `repository` | Explicit producer scan boundary |
| `package` | Boundary supported by a package/project marker |
| `source-root` | Conventional source root containing source files |
| `directory` | Source-bearing directory supported by structural convention |

`boundaryConfidence` concerns the existence of a structural boundary only. It MUST NOT be interpreted as confidence in an MSSP layer assignment.

A candidate has no `layer`. Promotion to `modules` requires a separate classification or declaration step that supplies an MSSP contract.

## 7. Discovery metadata

`discovery` is optional and scanner-oriented. It may contain:

- explicit root marker `.`;
- optional source revision;
- whether the scan was truncated;
- deterministic ignore rules;
- total file and source-file counts;
- language counts and observed extensions;
- recognized ecosystem markers and their boundary paths.

A consumer MUST check `discovery.truncated` before treating inventory counts as complete.

## 8. Relations

The v0.2 relation kinds are:

| Kind | Meaning |
|---|---|
| `requires` | Runtime module dependency |
| `affects` | MSSP-VT declaration that the source module affects the target |
| `affected-by` | MSSP-VT declaration that the source module is affected by the target |

Each relation contains source evidence. Consumers MUST NOT infer that an MSSP-VT relation is a runtime dependency.

Scanner candidates do not automatically create relations. Structural co-location is not a runtime dependency.

## 9. Evidence

Evidence records explain why a normalized statement or candidate exists.

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

## 10. Determinism

For identical input and options, a conforming producer SHOULD emit byte-stable JSON after applying the same JSON formatting.

The reference producers guarantee:

- no generation timestamp;
- repository-relative source URIs;
- sorted modules and candidates;
- sorted module arrays;
- sorted compatibility maps;
- sorted relations;
- sorted policies and layers;
- sorted discovery markers and language inventory.

A revision changes output only when explicitly supplied.

## 11. CLI

Manifest adapter:

```bash
mssp model .
mssp model . --revision <git-sha>
mssp model . --revision <git-sha> --out mssp-model.json
```

Repository scanner:

```bash
mssp scan .
mssp scan . --revision <git-sha>
mssp scan . --max-files 10000 --out repository-scan.json
```

Both commands export JSON that validates against `schemas/intermediate-model.schema.json`.

## 12. Consumer boundary

New architecture consumers SHOULD read the Intermediate Model rather than parse source manifests or scanner-specific output directly.

The reference graph generator follows this rule for declared modules:

```text
LoadedProject
    ↓ manifest adapter
MSSP Intermediate Model
    ↓ graph projection
MSSP Graph / Mermaid
```

Repository discovery follows:

```text
Repository
    ↓ repository scanner
Intermediate Model with candidates
    ↓ classification / declaration
Intermediate Model with modules
    ↓ consumers
```

Graph and governance consumers MUST distinguish `modules` from `candidates`.

## 13. Compatibility

During `0.x`, fields may evolve with explicit migration notes. The following meanings must not silently change within v0.2:

- `modules` are classified MSSP modules;
- `candidates` are unclassified structural boundaries;
- candidates do not possess an MSSP layer;
- `requires` is a runtime module dependency;
- `affects` and `affected-by` are MSSP-VT impact declarations;
- source URIs identify evidence locations, not executable imports;
- `generatedBy.adapter` identifies the producer adapter;
- `schemaVersion` identifies this model contract.

A model consumer MUST reject unsupported major or incompatible schema versions rather than guessing.
