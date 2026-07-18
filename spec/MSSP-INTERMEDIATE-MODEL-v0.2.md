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

The model distinguishes:

- **declared modules**, which have an approved MSSP layer and contract;
- **unclassified candidates**, which have structural evidence but no approved MSSP layer;
- **scanner discovery evidence**, which records observations without converting them into architecture declarations.

## 2. Design requirements

An Intermediate Model document MUST be:

- language-neutral;
- independent of absolute host paths;
- deterministic for identical inputs and options;
- explicit about producer and adapter identity;
- traceable to declarations or evidence;
- serializable as JSON;
- valid against the normative JSON Schema.

It MUST NOT require a wall-clock generation timestamp. A producer MAY attach an explicit source revision.

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

A repository scanner includes a `discovery` object:

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
    "markers": [],
    "ignore": {
      "files": [],
      "ignoredFiles": 0,
      "ignoredDirectories": 0
    },
    "generated": {
      "files": 0,
      "paths": []
    },
    "workspaces": [],
    "dependencies": []
  }
}
```

Manifest-only producers omit `discovery`.

## 4. Source references

Every project, layer, module, candidate, relation, policy, and scanner evidence record is traceable through a source reference:

```json
{
  "kind": "scanner",
  "uri": "packages/exporter/package.json",
  "format": "json",
  "adapter": "repository-scanner",
  "revision": "<optional-source-revision>"
}
```

Supported source kinds are:

- `manifest`;
- `scanner`;
- `adapter`;
- `generated`.

`uri` SHOULD be repository-relative or otherwise portable. Producers MUST NOT expose host-specific absolute paths when a portable path exists.

## 5. Declared modules

A normalized module includes:

- identity, version, layer, and purpose;
- activation, inputs, and outputs;
- module, tool, and data requirements;
- permissions and risk level;
- failure modes, validation, and representative tests;
- compatibility and MSSP-VT impact;
- source references and evidence.

Declared module dependencies become normative `relations` only because they originate from MSSP contracts.

## 6. Unclassified candidates

A candidate represents evidence of a possible architectural boundary before classification review.

```json
{
  "id": "candidate.packages.export-pdf",
  "name": "export-pdf",
  "path": "packages/export-pdf",
  "boundaryKind": "package",
  "boundaryConfidence": 0.98,
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
| `repository` | Explicit scan boundary |
| `package` | Project/package marker or workspace-supported boundary |
| `source-root` | Conventional source directory |
| `directory` | Source-bearing structural directory |

A candidate has no `layer`. `boundaryConfidence` concerns structural boundaries only and MUST NOT be interpreted as MSSP layer confidence.

## 7. Discovery inventory and markers

`discovery.inventory` records deterministic file, source-file, language, and extension counts.

`discovery.markers` records recognized ecosystem files and their boundary paths. A marker is evidence that a package or project boundary may exist; it is not a module declaration.

Consumers MUST check `discovery.truncated` before treating inventory or dependency evidence as complete.

## 8. Ignore evidence

`discovery.ignore` records:

- each read `.gitignore` file;
- its repository-relative base path;
- normalized non-comment patterns;
- ignored-file and ignored-directory counts.

Hard-coded dependency, build, cache, and editor exclusions remain in `discovery.ignoredDirectories`.

The reference scanner implements a documented static subset of Git ignore semantics. Consumers MUST NOT infer full Git equivalence from this field.

## 9. Generated-source observations

`discovery.generated` records conservatively recognized generated-source paths.

Generated files remain part of inventory but may be excluded from source-derived architecture evidence. A generated observation does not prove generator provenance.

## 10. Workspace declarations

A workspace record contains:

```json
{
  "kind": "npm",
  "rootPath": ".",
  "patterns": ["packages/*"],
  "members": ["packages/exporter"],
  "source": {
    "kind": "scanner",
    "uri": "package.json",
    "format": "json"
  }
}
```

The v0.2 workspace kinds are `npm`, `pnpm`, and `cargo`.

Workspace membership strengthens structural boundary evidence but does not assign an MSSP layer, deployment unit, runtime relationship, or owner.

## 11. Static dependency evidence

Scanner-derived source references are stored in `discovery.dependencies`, not in normative `relations`.

```json
{
  "kind": "static-import",
  "scope": "workspace",
  "from": "candidate.src",
  "to": "candidate.packages.exporter",
  "targetKind": "candidate",
  "specifiers": ["@example/exporter"],
  "sourceFiles": ["src/index.ts"],
  "occurrences": 1,
  "evidence": []
}
```

Scopes are:

| Scope | Meaning |
|---|---|
| `internal` | Resolved inside the same candidate |
| `cross-boundary` | Relative source reference crosses candidates |
| `workspace` | Package specifier maps to a workspace member |
| `external` | Non-local target has no workspace candidate |
| `unresolved` | Local-looking target cannot be resolved |

Static dependency evidence MUST NOT be interpreted as a declared runtime dependency. Compiler, build, conditional-load, generated, or runtime behavior may differ.

## 12. Normative relations

The v0.2 relation kinds are:

| Kind | Meaning |
|---|---|
| `requires` | Declared runtime module dependency |
| `affects` | MSSP-VT declaration that the source affects the target |
| `affected-by` | MSSP-VT declaration that the source is affected by the target |

A repository scanner leaves `relations` empty until a governed declaration or later specification explicitly authorizes promotion.

## 13. Evidence

Evidence records explain why a statement exists.

```json
{
  "kind": "dependency",
  "message": "Static source references connect candidate.src to candidate.packages.exporter.",
  "source": {
    "kind": "scanner",
    "uri": "src/index.ts",
    "format": "source"
  },
  "data": {
    "parser": "static-regex-v0.2",
    "scope": "workspace"
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

Confidence scores alone are not evidence. AI-assisted conclusions MUST include inspectable supporting observations and remain distinguishable from declarations.

## 14. Determinism

For identical input and options, a conforming producer SHOULD emit byte-stable JSON after the same formatting.

The reference producers guarantee:

- no generation timestamp;
- repository-relative source URIs;
- sorted modules, candidates, relations, policies, and layers;
- sorted discovery markers, languages, ignore files, workspaces, dependencies, source files, and specifiers;
- revision changes only when explicitly supplied.

## 15. CLI

Manifest adapter:

```bash
mssp model .
mssp model . --revision <git-sha> --out mssp-model.json
```

Repository scanner:

```bash
mssp scan .
mssp scan . --revision <git-sha>
mssp scan . --max-files 10000 --out repository-scan.json
```

Both outputs validate against `schemas/intermediate-model.schema.json`.

## 16. Consumer boundary

```text
Repository
    ↓ repository scanner
Intermediate Model with candidates and discovery evidence
    ↓ governed classification / declaration
Intermediate Model with modules and normative relations
    ↓ graph / validation / governance / IDE / Agent
```

Consumers MUST distinguish:

- candidate from module;
- static dependency evidence from runtime relation;
- inferred identity from declared identity;
- generated-source observation from provenance.

## 17. Compatibility

During `0.x`, fields may evolve with explicit migration notes. The following meanings must not silently change within v0.2:

- `modules` are classified MSSP modules;
- `candidates` are unclassified structural boundaries;
- candidates do not possess an MSSP layer;
- `discovery.dependencies` are scanner evidence, not runtime contracts;
- `requires` is a declared runtime module dependency;
- `affects` and `affected-by` are MSSP-VT declarations;
- source URIs identify evidence locations;
- `generatedBy.adapter` identifies the producer;
- `schemaVersion` identifies the model contract.

A consumer MUST reject unsupported or incompatible model versions rather than guessing.
