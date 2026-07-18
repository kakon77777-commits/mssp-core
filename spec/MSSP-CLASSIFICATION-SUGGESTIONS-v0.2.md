# MSSP Classification Suggestions v0.2

**Status:** Draft, advisory classifier implemented by MSSP Core  
**Report kind:** `mssp-classification-suggestions`  
**Normative schema:** `schemas/classification-suggestions.schema.json`

## 1. Purpose

The Classification Suggestions report converts repository-scan evidence into reviewable MSSP layer hypotheses.

It exists to assist architecture review without converting static observations into declarations.

```text
Repository
    ↓ Repository Scanner
Unclassified candidates + static evidence
    ↓ advisory classifier
Suggestion + support + counterevidence + unresolved questions
    ↓ human or governed-agent review
Approved module contract or rejected suggestion
```

A classification suggestion is not an MSSP module declaration.

## 2. Non-promotion invariant

Every report MUST state:

```json
{
  "method": {
    "mode": "advisory",
    "autoPromotion": false
  }
}
```

The classifier MUST NOT:

- add an MSSP `layer` to a scanner candidate;
- create entries in Intermediate Model `modules`;
- create normative runtime `relations`;
- edit FMS, SCL, SMS, TMS, DMS, Router, or Runtime manifests;
- approve its own recommendation.

Every suggestion has:

```json
{
  "status": "review-required"
}
```

## 3. Report envelope

```json
{
  "schemaVersion": "0.2",
  "kind": "mssp-classification-suggestions",
  "generatedBy": {
    "name": "@evemisslab/mssp-core",
    "version": "0.1.0",
    "adapter": "static-layer-classifier"
  },
  "sourceModel": {
    "projectId": "discovered.example",
    "projectName": "example",
    "scannerAdapter": "repository-scanner",
    "truncated": false,
    "revision": "<optional-source-revision>"
  },
  "classification": {
    "method": {},
    "suggestions": []
  }
}
```

The source revision is copied only when the Repository Scanner received an explicit revision.

## 4. Suggestion contract

```json
{
  "candidateId": "candidate.packages.export-pdf",
  "candidatePath": "packages/export-pdf",
  "status": "review-required",
  "suggestedLayer": "TMS",
  "confidence": "medium",
  "supportScore": 0.63,
  "alternativeLayers": [
    {
      "layer": "SMS",
      "supportScore": 0.17
    }
  ],
  "supportingEvidence": [],
  "counterEvidence": [],
  "unresolvedQuestions": []
}
```

`suggestedLayer` is one of:

- `FMS`;
- `SCL`;
- `SMS`;
- `TMS`;
- `DMS`;
- `ROUTER`;
- `RUNTIME`;
- `UNDETERMINED`.

`UNDETERMINED` is a valid and expected result. It means available static evidence does not support a sufficiently dominant hypothesis.

## 5. Support score

`supportScore` is a normalized heuristic-support value between 0 and 1.

It is not:

- a probability that the suggestion is correct;
- a substitute for architecture review;
- evidence by itself;
- a measure of implementation quality;
- a measure of candidate importance.

The reference classifier normalizes bounded rule weights. Consumers MUST interpret the accompanying evidence and questions, not only the number.

## 6. Confidence

Confidence is one of:

| Value | Meaning |
|---|---|
| `low` | Evidence is weak, ambiguous, aggregate, incomplete, or truncated |
| `medium` | A role hypothesis dominates static evidence but still requires semantic review |
| `high` | Multiple independent static signals reinforce the same hypothesis and no known scan incompleteness is present |

A truncated scan forces every suggestion to `low` confidence.

High confidence still does not authorize automatic promotion.

## 7. Evidence classes

The reference classifier uses only inspectable scanner evidence.

### 7.1 Role terminology

Candidate names and paths may contain terms associated with a layer, including:

- identity, manifest, architecture, constitution → FMS;
- policy, permission, governance, approval → SCL;
- core, kernel, domain, protocol, schema, model → SMS;
- plugin, addon, adapter, integration, exporter, feature → TMS;
- diagnostic, observability, telemetry, trace, logging, metrics → DMS;
- router, dispatcher, selector, registry, orchestrator → Router;
- runtime, executor, engine, runner, scheduler, worker → Runtime.

Terminology is evidence, not proof. A package named `core` can still be incorrectly named or optional.

### 7.2 Structural modularity

An independently declared package or workspace member weakly supports modular or replaceable interpretation.

This signal alone MUST NOT classify a candidate as TMS.

### 7.3 Dependency topology

Static candidate-to-candidate references may weakly indicate:

- shared inbound use, which can support an SMS hypothesis;
- outward dependency on another candidate, which can support a TMS hypothesis;
- a consumed dependency leaf, which can support stable-capability interpretation.

Static imports do not establish runtime necessity, activation, replaceability, ownership, or failure isolation.

## 8. Counterevidence

A report preserves evidence for competing hypotheses.

Examples:

- a candidate named `plugin` is referenced by many other candidates;
- a candidate named `core` is independently packaged and may be replaceable;
- local-looking imports remain unresolved;
- the scan is truncated;
- multiple layer terminologies occur in the same boundary.

Counterevidence MUST remain separately inspectable from supporting evidence.

## 9. Unresolved questions

Static classification cannot answer the defining semantic questions of MSSP.

For SMS/TMS review, a report asks at least:

1. Can a coherent system version operate without this candidate?
2. Is activation unconditional or context-dependent?
3. Which stable contracts may depend on it?
4. Can it fail, be removed, or be replaced without invalidating system identity?

Other layers have layer-specific questions concerning metadata purity, policy authority, business-state ownership, routing responsibility, execution authority, and observability boundaries.

## 10. Aggregate boundaries

Repository roots and conventional source roots are aggregate discovery boundaries.

The reference classifier returns `UNDETERMINED` for them and records `aggregate-boundary-exclusion` evidence.

An aggregate directory may contain multiple MSSP roles and MUST NOT be treated as a single module merely because it is a candidate.

## 11. Reference rules

The v0.2 reference method identifier is:

```json
{
  "id": "mssp-static-layer-heuristics",
  "version": "0.2"
}
```

The method currently combines:

- layer-associated path and name tokens;
- package and workspace structure;
- inbound and outbound candidate-reference topology;
- unresolved-dependency and truncation penalties;
- dominance thresholds between competing layer scores.

The rule set is deterministic. It does not call an AI model, execute repository code, access a network, or inspect runtime behavior.

## 12. CLI

```bash
mssp classify .
mssp classify . --revision <git-sha>
mssp classify . --max-files 10000
mssp classify . --revision <git-sha> --out classification-suggestions.json
```

The command first runs the same read-only Repository Scanner used by `mssp scan`, then builds a separate classification report.

It does not modify the repository.

## 13. Review workflow

A reviewer SHOULD process a suggestion as follows:

```text
Read supporting evidence
    ↓
Read counterevidence
    ↓
Answer unresolved questions
    ↓
Accept / revise / reject hypothesis
    ↓
Write or update an explicit MSSP module contract
    ↓
Run lint, island, and architecture review
```

Acceptance requires a separate declaration action. The suggestion report itself never becomes the authoritative architecture contract.

## 14. Security boundary

The classifier:

- consumes an in-memory Repository Scan Model;
- performs deterministic local computation;
- does not execute source code;
- does not access the network;
- does not write module manifests;
- does not approve or merge changes;
- does not conceal unresolved evidence.

## 15. Current limitations

The v0.2 classifier does not yet understand:

- runtime activation conditions;
- feature flags and deployment topology;
- compiler-grade dependency graphs;
- state ownership;
- API stability history;
- failure isolation or rollback behavior;
- test and coverage semantics;
- human ownership and organizational boundaries;
- FMS narrative meaning;
- historical change frequency;
- explicit user answers to classification questions.

These limitations are why every result remains advisory and review-required.

## 16. Compatibility

Within v0.2, the following meanings MUST NOT silently change:

- `autoPromotion: false` means no candidate is modified or promoted;
- `review-required` means no suggestion is approved;
- `supportScore` is heuristic support, not probability;
- `UNDETERMINED` is a valid classification result;
- supporting evidence and counterevidence remain distinct;
- truncated scans cannot produce medium or high confidence;
- a classification report is not an Intermediate Model module declaration.
