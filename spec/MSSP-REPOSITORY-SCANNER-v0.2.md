# MSSP Repository Scanner v0.2

**Status:** Draft, dependency-aware static evidence implemented by MSSP Core  
**Scanner adapter:** `repository-scanner`  
**Output contract:** `schemas/intermediate-model.schema.json`

## 1. Purpose

The Repository Scanner discovers inspectable structural evidence in an existing repository before the repository has complete MSSP manifests.

It answers six limited questions:

1. What files and source languages are present?
2. Which ecosystem markers identify project or package boundaries?
3. Which conventional directories are plausible module boundaries?
4. Which declared workspaces strengthen those boundary candidates?
5. Which static source references cross candidate boundaries?
6. What evidence supports every discovery statement?

It does **not** decide that a candidate is SMS, TMS, FMS, SCL, DMS, Router, or Runtime.

```text
Repository
    ↓ deterministic bounded inventory
Markers / .gitignore / workspaces / generated-source conventions
    ↓ static dependency evidence
Unclassified structural candidates
    ↓ human or governed-agent review
Declared MSSP modules
```

## 2. Output model

`mssp scan` emits an MSSP Intermediate Model v0.2 document.

For an unclassified repository scan:

- `modules` is empty;
- `layers` is empty;
- `relations` is empty;
- `candidates` contains structural candidates;
- `discovery` contains inventory, markers, ignore evidence, generated-source observations, workspace declarations, and static dependencies;
- `project.metadata.classificationStatus` is `unclassified`.

Scanner dependency evidence remains inside `discovery.dependencies`. It is not promoted into normative MSSP runtime `relations` because a source import is evidence, not yet an architecture contract.

## 3. Candidate contract

Each candidate contains:

- deterministic candidate ID;
- repository-relative path;
- boundary kind and structural confidence;
- classification status;
- file and source-file counts;
- observed languages;
- source reference and evidence.

The v0.2 boundary kinds are:

| Kind | Meaning |
|---|---|
| `repository` | Explicit scan root |
| `package` | Recognized package/project or declared workspace member |
| `source-root` | Conventional source directory containing source files |
| `directory` | Source-bearing child of a conventional multi-module container |

`boundaryConfidence` measures confidence that a path is a structural boundary. It is **not** MSSP layer-classification confidence.

A declared workspace member raises structural confidence to at least `0.98`, while leaving:

```json
{
  "status": "unclassified"
}
```

## 4. Recognized markers

The scanner recognizes:

| Marker | Ecosystem |
|---|---|
| `package.json`, `pnpm-workspace.yaml` | Node.js workspace/package |
| `pyproject.toml`, `setup.py` | Python |
| `Cargo.toml` | Rust package/workspace |
| `go.mod` | Go |
| `project.godot` | Godot |
| `pom.xml`, `build.gradle`, `build.gradle.kts` | JVM |
| `*.csproj`, `*.sln` | .NET |

Where safely available, project name and version are read as text. Repository code is never executed.

## 5. Workspace evidence

The reference scanner reads static workspace declarations from:

- `package.json` `workspaces` arrays or `workspaces.packages`;
- `pnpm-workspace.yaml` `packages`;
- `Cargo.toml` `[workspace].members`.

A workspace record contains:

```json
{
  "kind": "npm",
  "rootPath": ".",
  "patterns": ["packages/*"],
  "members": ["packages/exporter"],
  "source": {
    "kind": "scanner",
    "uri": "package.json"
  }
}
```

Workspace membership is structural evidence. It does not imply SMS, TMS, deployment, ownership, or runtime activation.

## 6. Static dependency evidence

The reference scanner performs bounded, non-executing textual extraction for:

- JavaScript and TypeScript `import`, `export ... from`, `require()`, and literal dynamic `import()`;
- Python `import` and `from ... import`;
- Go quoted import paths;
- Rust `use` roots;
- GDScript literal `preload()` and `load()`.

Each aggregated dependency contains:

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

The scopes are:

| Scope | Meaning |
|---|---|
| `internal` | Source reference resolves inside the same candidate |
| `cross-boundary` | Relative reference resolves into another candidate |
| `workspace` | Package specifier resolves to a declared workspace member |
| `external` | Non-local specifier has no workspace target |
| `unresolved` | Local-looking specifier cannot be resolved from the scanned inventory |

The parser identifier is recorded as `static-regex-v0.2`. These results are static evidence, not AST-complete or runtime-complete dependency truth.

## 7. `.gitignore` evaluation

The scanner reads root and nested `.gitignore` files before scanning each directory. It supports:

- comments and blank lines;
- `!` negation for already reachable paths;
- anchored and unanchored patterns;
- `*`, `**`, and `?` wildcards;
- trailing `/` directory patterns.

The output records ignore files, normalized patterns, ignored-file count, and ignored-directory count.

The implementation intentionally does not execute Git. It does not yet reproduce every escaping, attribute, or parent-directory re-inclusion edge case from Git's complete ignore engine. Hard-coded dependency/build/cache exclusions remain active independently.

## 8. Generated-source observation

Files are marked as generated evidence when paths match conservative conventions such as:

- `generated/` or `gen/` directories;
- `*.generated.*`;
- `*.g.cs`, `*.g.dart`;
- `*_pb2.py`;
- minified JavaScript or CSS names.

Generated files remain in the inventory but are excluded from static dependency extraction. This prevents generated imports from being mistaken for hand-authored architecture evidence.

The scanner does not yet establish provenance between generated files and their generators.

## 9. Determinism and resource bounds

For identical repository contents and scanner options, the reference scanner:

- traverses entries lexically;
- emits repository-relative paths;
- skips symbolic links;
- sorts markers, languages, candidates, workspaces, dependencies, and evidence;
- omits wall-clock timestamps;
- attaches a revision only when explicitly supplied.

The default scan bound is 50,000 files:

```bash
mssp scan . --max-files 10000
```

When reached, `discovery.truncated` is `true`. Consumers MUST NOT treat a truncated scan as a complete inventory.

## 10. Security boundary

The scanner:

- performs local read-only inspection;
- does not execute source files, build scripts, package managers, plugins, or Git;
- does not access the network;
- skips symbolic links;
- limits recognized metadata and source-file reads by size;
- rejects non-positive `maxFiles` values.

## 11. CLI

```bash
mssp scan .
mssp scan . --revision <git-sha>
mssp scan . --max-files 10000
mssp scan . --revision <git-sha> --out repository-scan.json
```

The output validates against the MSSP Intermediate Model schema.

## 12. Current limitations

The v0.2 scanner does not yet provide:

- Tree-sitter or compiler-grade AST import analysis;
- language-specific alias and build-configuration resolution;
- runtime dependency inference;
- automatic MSSP layer classification;
- candidate-to-module promotion;
- FMS/code consistency analysis;
- Git diff impact analysis;
- complete Git ignore equivalence;
- generated-source provenance.

These are later Repository Architecture Intelligence slices. Static evidence must remain distinguishable from declared architecture and from AI-generated interpretation.
