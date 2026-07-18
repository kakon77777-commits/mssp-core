# MSSP EML Adapter v0.3

**Status:** Normative reference-adapter specification  
**Adapter ID:** `eml-mssp-export`  
**Input kind:** `eml-mssp-export` v0.3  
**Output:** MSSP Intermediate Model v0.2

## 1. Boundary

The EML adapter consumes a versioned JSON semantic export produced by an EML toolchain.

It does not parse raw `.eml` source, import an EML parser, execute EML, load editor plugins, inspect a live runtime, or retrieve remote definitions.

```text
EML parser / editor / compiler
          ↓ explicit semantic export
   eml-mssp-export v0.3
          ↓ read-only adapter
MSSP Intermediate Model v0.2
```

This boundary keeps MSSP Core independent from the EML implementation while allowing EML-native tools to publish architecture evidence.

## 2. Input schema

The input MUST conform to:

```text
schemas/eml-adapter-input.schema.json
```

Its top-level identity is:

```json
{
  "schemaVersion": "0.3",
  "kind": "eml-mssp-export"
}
```

The export contains:

- project identity and source URI;
- optional explicit layer paths;
- optional explicit policies;
- EML semantic symbols;
- optional complete MSSP declarations attached to symbols;
- optional structural candidate hints.

## 3. Symbol authority rule

`symbolKind` describes an EML semantic category. It does not declare an MSSP module.

```text
symbolKind == module             ≠ MSSP module declaration
complete symbol.declaration      = module representation
missing symbol.declaration       = unclassified candidate
```

The adapter MUST NOT fill missing module-contract fields. An incomplete `declaration` is invalid input rather than a partially approved module.

## 4. Module mapping

A symbol with a schema-valid `declaration` maps to one `IntermediateModule`.

| EML export | Intermediate Model |
|---|---|
| `symbol.id` | `module.id` |
| `symbol.name` | `module.name` |
| `symbol.sourceUri` | adapter source URI |
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

The adapter records declaration evidence with:

```json
{
  "authority": "explicit-declaration"
}
```

This is source provenance, not a claim that SCL has approved or registered the module.

## 5. Candidate mapping

A symbol without `declaration` maps to an `IntermediateCandidate`.

Candidate IDs use:

```text
candidate.eml.<symbol.id>
```

The candidate always has:

```json
{
  "status": "unclassified"
}
```

Optional `candidate` hints may provide path, boundary kind, structural confidence, file counts, and languages. They are structural hints only and MUST NOT become classification confidence.

When hints are absent, the reference adapter uses conservative deterministic defaults:

```json
{
  "boundaryKind": "directory",
  "boundaryConfidence": 0.5,
  "fileCount": 1,
  "sourceFileCount": 1,
  "languages": ["eml"]
}
```

## 6. Relation mapping

Relations are generated only from complete module declarations:

```text
declaration.requirements.modules -> requires
declaration.changeImpact.affects  -> affects
declaration.changeImpact.affectedBy -> affected-by
```

No relation is inferred from `symbolKind`, source proximity, naming, imports, calls, or candidate hints.

Targets absent from the export remain as relation targets. Downstream graph and visualization tools may represent them as unresolved references.

## 7. Layer and policy mapping

Only explicit top-level `layers` and `policies` are emitted.

The adapter does not synthesize layer paths from source directories and does not derive policies from EML syntax or metadata.

## 8. Provenance

Every emitted source uses:

```json
{
  "kind": "adapter",
  "adapter": "eml-mssp-export"
}
```

`sourceUri` is normalized to forward slashes. Absolute filesystem paths are rejected. A CLI `--revision` value is copied to project, layer, policy, module, candidate, relation, and evidence sources.

## 9. Determinism

The reference adapter:

- rejects duplicate symbol, layer, and policy identities;
- deduplicates and lexically sorts string arrays;
- lexically sorts compatibility maps;
- sorts modules, candidates, layers, policies, and relations;
- emits no timestamp;
- does not modify the input object.

## 10. Reference CLI

List the descriptor:

```bash
mssp adapters --json
```

Adapt an export:

```bash
mssp adapt eml examples/eml-adapter/semantic-export.json \
  --revision HEAD \
  --out eml-intermediate-model.json
```

`eml` is a CLI alias for the stable adapter ID `eml-mssp-export`.

## 11. Security properties

The reference adapter performs JSON parsing and schema validation only.

It does not:

- execute EML or JavaScript from the export;
- resolve imports;
- read source URIs;
- invoke Git;
- invoke a package manager;
- access the network;
- write to the EML project;
- register output modules.

## 12. Reference fixture

The repository fixture is:

```text
examples/eml-adapter/semantic-export.json
```

It demonstrates:

- an explicit SMS declaration;
- an explicit TMS declaration;
- a declared dependency;
- an EML symbol whose `symbolKind` is `module` but remains an unclassified candidate because it lacks a complete declaration.

## 13. Non-goals

EML Adapter v0.3 does not define the canonical EML AST, parser output, source grammar, editor protocol, runtime trace format, or future EML compiler API.

A later EML toolchain integration may emit this export directly. Such integration remains outside MSSP Core.
