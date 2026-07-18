# MSSP Visualization Model v0.3

Status: Draft interoperability specification.

## Purpose

The Visualization Model is a deterministic, read-only projection of the MSSP Intermediate Model for humans, IDEs, agents, and browser tools.

```text
Intermediate Model
       ↓ deterministic projection
Visualization Model
       ↓ optional renderer
Interactive read-only views
```

It is not an architecture authority. Displaying a candidate does not approve it, regrouping a node does not change its declared MSSP layer, and displaying a relation does not prove runtime execution or compatibility.

## Identity

A conforming document uses:

```json
{
  "schemaVersion": "0.3",
  "kind": "mssp-visualization-model"
}
```

The normative Schema is `schemas/visualization.schema.json`.

## Required structure

Required top-level fields are:

- `generatedBy`
- `project`
- `view`
- `groups`
- `projections`
- `nodes`
- `edges`
- `scale`
- `invariants`

## Canonical architecture groups

`groups` preserves the architecture-layer identity used by every node:

1. `FMS`
2. `SCL`
3. `SMS`
4. `TMS`
5. `DMS`
6. `ROUTER`
7. `RUNTIME`
8. `UNCLASSIFIED`
9. `UNRESOLVED`

Unused canonical groups may be omitted. Projection groups do not replace or mutate this canonical node field.

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

## Multi-view projections

Every reference Visualization Model includes these deterministic projection IDs:

```text
layer
status
risk
connectivity
```

A projection contains:

- stable `id`;
- human-readable `label` and `description`;
- explicit `groupBy` semantics;
- ordered groups;
- sorted `nodeIds` for every group.

Every node must occur exactly once in every projection. Switching projections changes presentation only. The node's canonical `group`, `status`, declaration, source, and relations remain unchanged.

### Layer projection

`groupBy: architecture-layer`

Uses the canonical MSSP architecture groups, including `UNCLASSIFIED` and `UNRESOLVED`.

### Status projection

`groupBy: node-status`

Groups nodes as:

```text
declared
unclassified
unresolved
```

This is a presentation of existing node status. It is not a review decision.

### Risk projection

`groupBy: risk-level`

Groups nodes as:

```text
L0
L1
L2
L3
L4
UNSPECIFIED
```

`UNSPECIFIED` means the node has no declared risk metadata. The renderer must not infer risk from names, source paths, node kind, relation degree, or ecosystem metadata.

### Connectivity projection

`groupBy: relation-degree`

The reference projection counts visible model edges incident on each node:

```text
isolated   degree 0
leaf       degree 1
connected  degree 2–3
hub        degree 4+
```

This is a structural degree summary. It is not a measure of architectural importance, authority, quality, risk, centrality at runtime, or business criticality.

## Default projection

`view.defaultProjection` selects the first renderer view. `view.availableProjections` lists the supported deterministic projection IDs.

The reference CLI accepts:

```text
--view layer|status|risk|connectivity
```

Changing the default view must not alter nodes, edges, canonical groups, or governance state.

## Large-graph scale profile

`scale` records renderer controls and model size:

```json
{
  "nodeCount": 1000,
  "edgeCount": 2500,
  "largeGraph": true,
  "threshold": 500,
  "initialNodeLimit": 200,
  "batchSize": 200,
  "maxRenderedEdges": 2000,
  "nodeRendering": "bounded-batch",
  "edgeRendering": "visible-endpoints-only"
}
```

The profile is deterministic configuration, not a claim that rendering performance is identical across browsers or hardware.

### Bounded-batch nodes

When `largeGraph` is true, the reference renderer initially materializes at most `initialNodeLimit` matching nodes. Additional nodes are added in `batchSize` increments.

All nodes remain present in the embedded Visualization Model. Bounded DOM rendering is not data deletion, classification, sampling authority, or architecture truncation.

### Visible-endpoint edges

The reference renderer indexes edges by endpoint and draws only relations whose two endpoints are currently materialized. It draws no more than `maxRenderedEdges` SVG paths per render pass.

Hidden relations remain present in `model.edges`. A renderer limit must never be interpreted as absence of a declared relation.

## Source navigation

A producer may accept `sourceBase` and create `sourceHref` by appending the encoded repository-relative path. When at least one link exists, `view.sourceNavigation` is `true`.

Source links are navigation hints only. They do not change source identity or architecture authority.

## Determinism

For identical input and options, serialized JSON must be equivalent.

- canonical groups follow fixed order;
- nodes sort by canonical group and node ID;
- edges sort by stable edge ID;
- projection order is `layer`, `status`, `risk`, `connectivity`;
- projection groups follow fixed semantic order;
- projection node IDs sort lexicographically;
- candidate languages sort lexicographically;
- scale controls are explicit positive integers;
- no generated timestamp is included.

## Reference HTML renderer

The reference renderer is a self-contained HTML document with:

- no external JavaScript, CSS, fonts, analytics, or CDN dependency;
- projection switching;
- projection-group filtering and text search;
- bounded-batch node materialization;
- visible-endpoint edge rendering;
- node inspection;
- optional source navigation;
- script-safe embedded JSON;
- no architecture mutation or automatic classification.

Other renderers may use different layouts while preserving model semantics and the read-only authority boundary.

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
  [--view layer|status|risk|connectivity] \
  [--revision value] \
  [--source-base url] \
  [--large-graph-threshold number] \
  [--initial-node-limit number] \
  [--batch-size number] \
  [--max-rendered-edges number] \
  [--out file]
```

`html` is the default. `json` emits the Visualization Model directly. All numeric scale controls must be positive integers.

## Conformance

A producer conforms when its output validates against the Schema, remains deterministic, keeps candidates unclassified, preserves unresolved endpoints, includes every node exactly once in every projection, and retains the fixed read-only invariants.

A renderer conforms when it consumes a valid model without promoting evidence into architecture declarations and without treating hidden or not-yet-materialized nodes and edges as absent from the model.
