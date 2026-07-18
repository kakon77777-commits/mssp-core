# MSSP Visualization Model v0.3

Status: Draft interoperability specification.

## Purpose

The Visualization Model is a deterministic, read-only projection of the MSSP Intermediate Model for humans, IDEs, agents, and browser tools.

```text
Intermediate Model
       ↓ deterministic projection
Visualization Model
       ↓ optional renderer
Interactive read-only view
```

It is not an architecture authority. Displaying a candidate does not approve it, and displaying a relation does not prove runtime execution or compatibility.

## Identity

A conforming document uses:

```json
{
  "schemaVersion": "0.3",
  "kind": "mssp-visualization-model"
}
```

The normative Schema is `schemas/visualization.schema.json`.

## Structure

Required top-level fields are:

- `generatedBy`
- `project`
- `view`
- `groups`
- `nodes`
- `edges`
- `invariants`

Canonical group order:

1. `FMS`
2. `SCL`
3. `SMS`
4. `TMS`
5. `DMS`
6. `ROUTER`
7. `RUNTIME`
8. `UNCLASSIFIED`
9. `UNRESOLVED`

Unused groups may be omitted.

## Nodes

Declared modules use `kind: module`, `status: declared`, and their declared MSSP layer.

Candidates use `kind: candidate`, `status: unclassified`, and `group: UNCLASSIFIED`. The visualization projection must not assign them an MSSP layer.

A relation endpoint absent from the module and candidate sets is preserved as `kind: reference`, `status: unresolved`, and `group: UNRESOLVED`. This prevents incomplete architecture evidence from disappearing.

Nodes preserve source identity through `source` and `sourceUri`. Optional module fields include version, purpose, entry, and risk level. Candidate fields may include boundary kind, boundary confidence, file counts, and languages.

## Edges

Edges project Intermediate Model relations:

- `requires`
- `affects`
- `affected-by`

Each edge preserves endpoints, relation kind, source, and evidence count. Duplicate edges with the same kind and endpoints may be collapsed.

Edges are declarations or evidence projections, not runtime traces.

## Source navigation

A producer may accept `sourceBase` and create `sourceHref` by appending the encoded repository-relative path. When at least one link exists, `view.sourceNavigation` is `true`.

Source links are navigation hints only. They do not change source identity or architecture authority.

## Determinism

For identical input and options, serialized JSON must be equivalent.

- groups follow canonical order;
- nodes sort by group and node ID;
- edges sort by stable edge ID;
- candidate languages sort lexicographically;
- no generated timestamp is included.

## Reference HTML renderer

The reference renderer is a self-contained HTML document with:

- no external JavaScript, CSS, fonts, analytics, or CDN dependency;
- layer filtering and text search;
- node inspection;
- rendered relations;
- optional source navigation;
- script-safe embedded JSON;
- no architecture mutation or automatic classification.

Other renderers may use different layouts while preserving model semantics.

## Mandatory invariants

```json
{
  "invariants": {
    "readOnly": true,
    "autoMutation": false
  }
}
```

These values are protocol invariants.

## CLI profile

```bash
mssp viz [project] \
  [--format html|json] \
  [--revision value] \
  [--source-base url] \
  [--out file]
```

`html` is the default. `json` emits the Visualization Model directly.

## Conformance

A producer conforms when its output validates against the Schema, remains deterministic, keeps candidates unclassified, preserves unresolved endpoints, and retains the fixed read-only invariants.

A renderer conforms when it consumes a valid model without promoting evidence into architecture declarations.
