# MSSP Python Adapter v0.3

**Status:** Normative reference-adapter specification  
**Adapter ID:** `python-mssp-export`  
**Input kind:** `python-mssp-export` v0.3  
**Output:** MSSP Intermediate Model v0.2

## 1. Boundary

The Python adapter consumes a versioned JSON semantic export produced by a Python-side toolchain.

It does not import project packages, execute Python, inspect a live interpreter, invoke packaging hooks, resolve dependencies, read `sourceUri` targets, or retrieve remote metadata.

```text
Python parser / packaging tool / IDE
               ↓ explicit semantic export
       python-mssp-export v0.3
               ↓ read-only adapter
     MSSP Intermediate Model v0.2
```

This boundary permits Python-native tooling to publish architecture evidence without making MSSP Core depend on CPython, an AST library, a build backend, a virtual environment, or project code.

## 2. Input schema

The input MUST conform to:

```text
schemas/python-adapter-input.schema.json
```

Its top-level identity is:

```json
{
  "schemaVersion": "0.3",
  "kind": "python-mssp-export"
}
```

The export contains:

- project identity and portable source URI;
- optional distribution, Python-version, and build-backend metadata;
- optional explicit layer paths and policies;
- Python architectural components;
- optional complete MSSP declarations attached to components;
- optional structural candidate hints.

## 3. Python component authority rule

`pythonKind`, `qualifiedName`, `importPath`, and `entryPoints` describe Python structure. None of them declares an MSSP module.

```text
pythonKind == package/plugin/service  ≠ MSSP module declaration
entry point exists                    ≠ MSSP module declaration
complete component.declaration        = module representation
missing component.declaration         = unclassified candidate
```

The adapter MUST NOT derive an MSSP layer from a package name, module path, entry-point group, decorator, import graph, or directory location.

The adapter MUST NOT fill missing contract fields. An incomplete `declaration` is invalid input rather than a partially approved module.

## 4. Python component kinds

The v0.3 export recognizes:

```text
distribution
package
namespace-package
module
plugin
command
service
other
```

These values are source-system categories only. They do not imply FMS, SCL, SMS, TMS, DMS, Router, or Runtime.

## 5. Module mapping

A component with a schema-valid `declaration` maps to one `IntermediateModule`.

| Python export | Intermediate Model |
|---|---|
| `component.id` | `module.id` |
| `component.name` | `module.name` |
| `component.sourceUri` | adapter source URI |
| `declaration.version` | `module.version` |
| `declaration.layer` | `module.layer` |
| `declaration.purpose` | `module.purpose` |
| `declaration.entry` | `module.entry` |
| `declaration.activation` | `module.activation` |
| `declaration.inputs` | `module.inputs` |
| `declaration.outputs` | `module.outputs` |
| `declaration.requirements` | `module.requirements` |
| `declaration.permissions` | `module.permissions` |
| `declaration.riskLevel` | `module.riskLevel` |
| `declaration.failureModes` | `module.failureModes` |
| `declaration.validation` | `module.validation` |
| `declaration.tests` | `module.tests` |
| `declaration.compatibility` | `module.compatibility` |
| `declaration.changeImpact` | `module.changeImpact` |

Python-specific values are retained as metadata:

```text
qualifiedName -> metadata.pythonQualifiedName
importPath    -> metadata.pythonImportPath
entryPoints   -> metadata.pythonEntryPoints
pythonKind    -> metadata.pythonComponentKind
```

The adapter records declaration evidence with:

```json
{
  "authority": "explicit-declaration"
}
```

This is source provenance. It is not proof of SCL approval, registry membership, runtime loading, dependency safety, or deployment readiness.

## 6. Candidate mapping

A component without `declaration` maps to an `IntermediateCandidate`.

Candidate IDs use:

```text
candidate.python.<component.id>
```

The candidate always has:

```json
{
  "status": "unclassified"
}
```

Optional `candidate` hints may provide path, boundary kind, structural confidence, file counts, and languages. They are structural hints only and MUST NOT become MSSP classification confidence.

When hints are absent, the reference adapter uses deterministic defaults:

- `distribution`, `package`, `namespace-package`, and `plugin` default to `boundaryKind: package`;
- `module`, `command`, `service`, and `other` default to `boundaryKind: source-root`;
- `boundaryConfidence` defaults to `0.5`;
- file counts default to `1`;
- languages default to `["python"]`.

An exposed console script, plugin entry point, or importable service remains a candidate unless a complete MSSP declaration exists.

## 7. Relation mapping

Relations are generated only from complete module declarations:

```text
declaration.requirements.modules   -> requires
declaration.changeImpact.affects   -> affects
declaration.changeImpact.affectedBy -> affected-by
```

No relation is inferred from Python imports, `pyproject.toml` dependencies, package metadata, entry-point groups, qualified names, calls, decorators, annotations, or source proximity.

Targets absent from the export remain relation targets. Downstream graph and visualization tools may represent them as unresolved references.

## 8. Project metadata

The following optional source fields are preserved under project metadata:

```text
distributionName -> pythonDistributionName
requiresPython   -> pythonRequires
buildBackend     -> pythonBuildBackend
```

The adapter does not run the build backend or verify installed interpreter compatibility.

## 9. Provenance

Every emitted source uses:

```json
{
  "kind": "adapter",
  "adapter": "python-mssp-export"
}
```

`sourceUri` is normalized to forward slashes. Absolute filesystem paths are rejected. A CLI `--revision` value is copied to project, layer, policy, module, candidate, relation, and evidence sources.

## 10. Determinism

The reference adapter:

- rejects duplicate component IDs;
- rejects duplicate Python qualified names;
- rejects duplicate layer and policy identities;
- deduplicates and lexically sorts string arrays;
- lexically sorts compatibility maps;
- sorts modules, candidates, layers, policies, and relations;
- emits no timestamp;
- does not modify the input object.

## 11. Reference CLI

List all descriptors:

```bash
mssp adapters --json
```

Adapt an export:

```bash
mssp adapt python examples/python-adapter/semantic-export.json \
  --revision HEAD \
  --out python-intermediate-model.json
```

`python` and `py` are CLI aliases for the stable adapter ID `python-mssp-export`.

## 12. Security properties

The reference adapter performs JSON parsing, schema validation, deterministic normalization, and Intermediate Model conformance checking only.

It does not:

- import or execute Python modules;
- evaluate decorators, annotations, descriptors, or module-level code;
- invoke CPython, PyPy, or another interpreter;
- inspect a virtual environment;
- invoke `pip`, `uv`, Poetry, Hatch, PDM, setuptools, or a PEP 517 build backend;
- resolve imports or distribution dependencies;
- read source URIs;
- invoke Git;
- access the network;
- write to the Python project;
- register output modules.

## 13. Reference fixture

The repository fixture is:

```text
examples/python-adapter/semantic-export.json
```

It demonstrates:

- Python distribution metadata;
- an explicit SMS package declaration;
- an explicit TMS plugin declaration;
- a declared runtime dependency;
- a plugin entry point retained as metadata;
- an importable service that remains an unclassified candidate because it lacks a complete declaration.

## 14. Non-goals

Python Adapter v0.3 does not define a canonical Python AST export, import resolver, packaging metadata reader, entry-point discovery process, runtime trace format, virtual-environment inspection protocol, or Python-side exporter implementation.

A later Python toolchain package may generate `python-mssp-export` directly. Such integration remains outside MSSP Core.
