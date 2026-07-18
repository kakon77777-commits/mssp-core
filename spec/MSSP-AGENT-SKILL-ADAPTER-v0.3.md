# MSSP Agent Skill Adapter v0.3

Status: normative for the reference `agent-skill-mssp-export` adapter.

## 1. Purpose

The Agent Skill Adapter translates an explicit, versioned agent-skill semantic export into MSSP Intermediate Model v0.2.

It is an interoperability boundary between an agent-framework-aware exporter and MSSP Core. It is not a skill loader, prompt runner, model client, tool broker, permission grant, memory service, workflow executor, package installer, architecture classifier, or approval mechanism.

## 2. Stable identity

```text
adapter id: agent-skill-mssp-export
CLI aliases: agent-skill, skill
input kind: agent-skill-mssp-export
input schemaVersion: 0.3
output kind: mssp-intermediate-model
output schemaVersion: 0.2
```

## 3. Required invariants

The descriptor MUST preserve:

```json
{
  "deterministic": true,
  "readOnly": true,
  "noExecution": true,
  "noNetwork": true,
  "autoPromotion": false,
  "autoMutation": false
}
```

The adapter MUST NOT:

- invoke an agent, model, prompt, skill, tool, workflow, evaluator, guardrail, handoff, or memory operation;
- open a tool transport, model API, browser, shell, MCP server, plugin host, package manager, or remote service;
- grant, test, elevate, or revoke permissions;
- read source-URI targets from the local filesystem;
- resolve tool availability, prompt inheritance, skill dependencies, handoffs, resources, model constraints, or runtime policy dynamically;
- inspect credentials, environment variables, session state, user memory, agent memory, or deployment configuration;
- access the network;
- mutate manifests, prompts, schemas, tools, policies, resources, MSSP manifests, or project registration;
- classify, approve, promote, register, activate, or load a module.

## 4. Input authority

The input is a semantic export produced by an agent-aware tool outside MSSP Core. MSSP Core validates and translates it; it does not prove that the export is complete, current, safe, authorized, installable, executable, or runtime-equivalent.

Agent Skill metadata is evidence, not architecture authority:

```text
framework and manifest versions
execution environments
model families and transports
skill identity and namespace
manifest, entrypoint, prompt, and schema paths
tool names and capabilities
triggers and model constraints
required and denied permissions
handoff or delegation targets
read and written resources
        !=
MSSP module declaration
```

Only a component containing a complete explicit `declaration` maps to an Intermediate Module.

A component without a declaration MUST remain an `unclassified` candidate, including an agent, skill, tool, prompt, workflow, resource, memory policy, guardrail, handoff, evaluator, or service.

## 5. Project metadata

The reference adapter MAY preserve:

| Input field | Output metadata key |
|---|---|
| `framework` | `agentSkillFramework` |
| `frameworkVersion` | `agentSkillFrameworkVersion` |
| `manifestFormat` | `agentSkillManifestFormat` |
| `manifestVersion` | `agentSkillManifestVersion` |
| `protocolVersion` | `agentSkillProtocolVersion` |
| `executionEnvironments` | `agentSkillExecutionEnvironments` |
| `modelFamilies` | `agentSkillModelFamilies` |
| `transports` | `agentSkillTransports` |

These fields do not authorize installation, model access, tool use, transport opening, execution, or deployment.

## 6. Component identity and metadata

Each component MUST provide a stable `skillIdentity` from the exporting tool. The adapter rejects duplicate component IDs and duplicate Agent Skill identities.

The reference adapter MAY preserve:

| Input field | Output metadata key |
|---|---|
| `skillIdentity` | `agentSkillIdentity` |
| `namespace` | `agentSkillNamespace` |
| `manifestPath` | `agentSkillManifestPath` |
| `entrypoint` | `agentSkillEntrypoint` |
| `promptPath` | `agentSkillPromptPath` |
| `inputSchemaUri` | `agentSkillInputSchemaUri` |
| `outputSchemaUri` | `agentSkillOutputSchemaUri` |
| `toolNames` | `agentSkillToolNames` |
| `capabilities` | `agentSkillCapabilities` |
| `triggers` | `agentSkillTriggers` |
| `requiredPermissions` | `agentSkillRequiredPermissions` |
| `deniedPermissions` | `agentSkillDeniedPermissions` |
| `delegatesTo` | `agentSkillDelegatesTo` |
| `readsResources` | `agentSkillReadsResources` |
| `writesResources` | `agentSkillWritesResources` |
| `modelConstraints` | `agentSkillModelConstraints` |
| `skillKind` | `agentSkillComponentKind` |

Array metadata MUST be deduplicated and lexicographically sorted.

## 7. Component kinds

The input schema recognizes:

```text
agent
skill
tool
prompt
workflow
resource
memory-policy
guardrail
handoff
evaluator
service
other
```

These values describe source-system shape only. They do not select an MSSP layer or runtime role.

## 8. Module mapping

A complete declaration maps to an Intermediate Module using the shared Declarative Adapter Builder.

The adapter MUST NOT infer or fill missing values for layer, version, compatibility, purpose, activation, inputs, outputs, requirements, permissions, risk, failure modes, validation, tests, or change impact.

An incomplete declaration is invalid input. It MUST NOT be completed heuristically from prompts, tools, capabilities, permissions, or manifest fields.

## 9. Candidate mapping

A component without a declaration maps to:

```text
candidate.agent-skill.<component-id>
status: unclassified
autoPromotion: false
```

Default boundaries are conservative:

- agent, skill, tool, workflow, service -> package;
- prompt, resource, memory-policy, guardrail, handoff, evaluator, other -> source-root.

An explicit candidate hint may refine structural evidence. It cannot assign a layer or approve promotion.

## 10. Relations

Normative relations are emitted only from complete declarations:

```text
declaration.requirements.modules     -> requires
declaration.changeImpact.affects     -> affects
declaration.changeImpact.affectedBy  -> affected-by
```

The adapter MUST NOT create normative relations from tool names, tool calls, triggers, prompts, entrypoints, schemas, capabilities, permissions, handoffs, delegation targets, resource reads or writes, model constraints, manifest dependencies, names, or directory proximity.

Such information may remain source metadata or scanner evidence, separate from declared architecture.

## 11. Permission boundary

`requiredPermissions` and `deniedPermissions` describe the source export. They do not grant or enforce permission.

A source permission field MUST NOT be copied into the normative MSSP permission contract unless it is also present in the complete explicit `declaration.permissions` object.

MSSP validation and SCL governance remain independent from source-framework permission syntax.

## 12. Source provenance

All source URIs MUST be repository-relative or portable logical URIs. Absolute POSIX paths and Windows drive paths are rejected.

All emitted sources MUST use:

```json
{
  "kind": "adapter",
  "adapter": "agent-skill-mssp-export"
}
```

A supplied revision is copied as provenance and is not independently verified.

## 13. Determinism and conformance

For identical input and options, serialized output MUST be identical.

The output MUST pass the Agent Skill input Schema, Intermediate Model Schema, adapter descriptor Schema, adapter conformance evaluation, stable ordering, identity, and portable provenance checks.

## 14. Interpretation boundary

A valid output means that a valid semantic export was deterministically translated.

It does not prove:

- skill installation or discoverability;
- prompt quality or model compatibility;
- tool availability, correctness, or safety;
- permission authorization or enforcement;
- memory isolation or privacy;
- handoff, delegation, workflow, or guardrail correctness;
- schema compatibility at runtime;
- successful model, tool, MCP, plugin, browser, shell, or network execution;
- semantic or runtime compatibility;
- SCL approval;
- runtime loading or deployment readiness.
