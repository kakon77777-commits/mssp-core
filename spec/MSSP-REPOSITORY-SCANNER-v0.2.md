# MSSP Repository Scanner v0.2

**Status:** Draft, foundation implemented by MSSP Core  
**Scanner adapter:** `repository-scanner`  
**Output contract:** `schemas/intermediate-model.schema.json`

## 1. Purpose

The Repository Scanner discovers structural evidence in an existing repository before the repository has complete MSSP manifests.

It answers four limited questions:

1. What files and source languages are present?
2. Which ecosystem markers identify project or package boundaries?
3. Which conventional directories are plausible module boundaries?
4. What evidence supports each candidate boundary?

It does **not** decide that a candidate is SMS, TMS, FMS, SCL, DMS, Router, or Runtime.

```text
Repository
    ↓ deterministic file inventory
Markers and structural boundaries
    ↓ evidence-backed discovery
Unclassified candidates
    ↓ human / governed agent review
Classified MSSP modules
    ↓
MSSP Intermediate Model consumers
```

## 2. Output model

`mssp scan` emits an MSSP Intermediate Model v0.2 document.

For an unclassified repository scan:

- `modules` is empty;
- `layers` is empty;
- `relations` is empty unless a later scanner stage has explicit evidence;
- `candidates` contains structural candidates;
- `discovery` contains inventory, marker, truncation, and ignore-rule information;
- `project.metadata.classificationStatus` is `unclassified`.

This allows scanners and manifest adapters to share one exchange model without pretending that structural discovery is architecture classification.

## 3. Candidate contract

Each candidate contains:

- deterministic candidate ID;
- portable repository-relative path;
- boundary kind;
- boundary confidence;
- classification status;
- file and source-file counts;
- observed source languages;
- source reference;
- evidence records.

The v0.2 boundary kinds are:

| Kind | Meaning |
|---|---|
| `repository` | Explicit scan root |
| `package` | Directory containing a recognized project/package marker |
| `source-root` | Conventional source directory containing source files |
| `directory` | Source-bearing child of a conventional multi-module container |

`boundaryConfidence` measures confidence that a path is a structural boundary. It is **not** confidence that the candidate belongs to an MSSP layer.

Every v0.2 candidate has:

```json
{
  "status": "unclassified"
}
```

A consumer MUST NOT reinterpret boundary confidence as SMS/TMS classification confidence.

## 4. Recognized markers

The foundation scanner recognizes:

| Marker | Ecosystem |
|---|---|
| `package.json` | Node.js |
| `pyproject.toml`, `setup.py` | Python |
| `Cargo.toml` | Rust |
| `go.mod` | Go |
| `project.godot` | Godot |
| `pom.xml`, `build.gradle`, `build.gradle.kts` | JVM |
| `*.csproj`, `*.sln` | .NET |

Where safely available, the scanner reads project name and version metadata. Marker parsing never executes repository code.

## 5. Conventional boundaries

The foundation scanner recognizes these source roots:

```text
app/
lib/
src/
```

It recognizes source-bearing children of these multi-module containers:

```text
addons/
apps/
crates/
modules/
packages/
plugins/
services/
```

These conventions produce candidates with inference evidence. They do not create MSSP modules automatically.

## 6. Ignored directories

The scanner skips common generated, dependency, cache, and editor directories, including:

```text
.git
node_modules
dist
build
coverage
target
.venv
venv
.next
.nuxt
bin
obj
```

The complete deterministic ignore set is returned in `discovery.ignoredDirectories`.

v0.2 does not yet parse `.gitignore`, nested ignore files, or ecosystem-specific ignore semantics.

## 7. Determinism

For identical repository contents and scanner options, the reference scanner provides deterministic output by:

- traversing entries in lexical order;
- emitting repository-relative paths;
- skipping symbolic links;
- sorting markers, languages, candidates, and evidence;
- omitting wall-clock timestamps;
- adding a revision only when explicitly supplied.

## 8. Resource bound

The default scan bound is 50,000 files.

```bash
mssp scan . --max-files 10000
```

When the bound is reached:

```json
{
  "discovery": {
    "truncated": true
  }
}
```

A truncated scan is still deterministic and schema-valid, but consumers MUST NOT treat it as a complete repository inventory.

## 9. CLI

```bash
mssp scan .
mssp scan . --revision <git-sha>
mssp scan . --max-files 10000
mssp scan . --revision <git-sha> --out repository-scan.json
```

The output validates against the MSSP Intermediate Model schema.

## 10. Security boundary

The scanner:

- performs local read-only file inspection;
- does not execute source files, build scripts, package managers, or plugins;
- does not access the network;
- skips symbolic links to avoid traversal cycles and boundary escape;
- reads only recognized marker files for metadata extraction;
- rejects non-positive `maxFiles` values.

## 11. Current limitations

The v0.2 foundation does not yet provide:

- AST import analysis;
- runtime dependency inference;
- FMS/code consistency analysis;
- Git diff impact analysis;
- automatic MSSP layer classification;
- `.gitignore` semantics;
- binary-language detection;
- generated-source provenance.

These are subsequent Repository Architecture Intelligence slices, not hidden claims of the foundation scanner.
