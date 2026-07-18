# MSSP Godot Adapter v0.3

Status: normative for the reference `godot-mssp-export` adapter.

## 1. Purpose

The Godot Adapter translates an explicit, versioned Godot semantic export into MSSP Intermediate Model v0.2.

It is an interoperability boundary between a Godot-aware exporter and MSSP Core. It is not a `project.godot` parser, scene loader, resource importer, GDScript analyzer, editor plugin host, headless editor, game runtime, architecture classifier, or approval mechanism.

## 2. Stable identity

```text
adapter id: godot-mssp-export
CLI aliases: godot, gd
input kind: godot-mssp-export
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

- launch the Godot editor, headless editor, game runtime, debugger, importer, exporter, or test runner;
- load or instantiate scenes, nodes, scripts, resources, autoloads, singletons, addons, or plugins;
- execute GDScript, C#, GDExtension, editor tools, tool scripts, native libraries, or plugin callbacks;
- parse source files or read `sourceUri` targets from the local filesystem;
- inspect editor settings, import caches, `.godot` state, environment variables, or deployment targets;
- resolve resources, dependencies, signals, groups, or scene inheritance dynamically;
- access the network;
- mutate `project.godot`, scenes, scripts, resources, addons, MSSP manifests, or project registration;
- classify, approve, promote, register, activate, or load a module.

## 4. Input authority

The input is a semantic export produced by a Godot-aware tool outside MSSP Core. MSSP Core validates and translates it; it does not prove that the export is complete, current, editor-equivalent, runtime-equivalent, or authorized.

Godot metadata is evidence, not architecture authority:

```text
engine version
renderer
main scene
project features
scripting languages
scene path
script path
class name
base type
node type
resource type
autoload name
plugin name and enabled state
signals and groups
        !=
MSSP module declaration
```

Only a component containing a complete explicit `declaration` maps to an Intermediate Module.

A component without a declaration MUST remain an `unclassified` candidate, including a scene, node, script, autoload, singleton, addon, editor plugin, resource, service, or test.

## 5. Project metadata

The reference adapter MAY preserve:

| Input field | Output metadata key |
|---|---|
| `engineVersion` | `godotEngineVersion` |
| `renderer` | `godotRenderer` |
| `mainScene` | `godotMainScene` |
| `projectFeatures` | `godotProjectFeatures` |
| `scriptingLanguages` | `godotScriptingLanguages` |

These fields do not grant permission to open, import, execute, export, deploy, or register the project.

## 6. Component identity and metadata

Each component MUST provide a stable `godotIdentity` from the exporting tool. Examples include a `res://` resource identity, an autoload identity, or a plugin identity. The adapter rejects duplicate component IDs and duplicate Godot identities.

The reference adapter MAY preserve:

| Input field | Output metadata key |
|---|---|
| `godotIdentity` | `godotIdentity` |
| `scenePath` | `godotScenePath` |
| `scriptPath` | `godotScriptPath` |
| `className` | `godotClassName` |
| `baseType` | `godotBaseType` |
| `nodeType` | `godotNodeType` |
| `resourceType` | `godotResourceType` |
| `autoloadName` | `godotAutoloadName` |
| `pluginName` | `godotPluginName` |
| `pluginEnabled` | `godotPluginEnabled` |
| `signals` | `godotSignals` |
| `groups` | `godotGroups` |
| `godotKind` | `godotComponentKind` |

Array metadata MUST be deduplicated and lexicographically sorted.

## 7. Component kinds

The input schema recognizes:

```text
project
scene
node
script
autoload
singleton
addon
editor-plugin
resource
service
test
other
```

These values describe source-system shape only. They do not select an MSSP layer.

## 8. Module mapping

A complete declaration maps to an Intermediate Module using the shared Declarative Adapter Builder.

The adapter MUST NOT infer or fill missing values for layer, version, compatibility, purpose, activation, inputs, outputs, requirements, permissions, risk, failure modes, validation, tests, or change impact.

An incomplete declaration is invalid input. It MUST NOT be completed heuristically.

## 9. Candidate mapping

A component without a declaration maps to:

```text
candidate.godot.<component-id>
status: unclassified
autoPromotion: false
```

Default boundaries are conservative:

- project -> repository;
- addon, editor-plugin, service -> package;
- scene, node, script, autoload, singleton, resource, test, other -> source-root.

An explicit candidate hint may refine structural evidence. It cannot assign a layer or approve promotion.

## 10. Relations

Normative relations are emitted only from complete declarations:

```text
declaration.requirements.modules     -> requires
declaration.changeImpact.affects     -> affects
declaration.changeImpact.affectedBy  -> affected-by
```

The adapter MUST NOT create normative relations from scene inheritance, node ownership, script attachment, signal connections, groups, autoload registration, plugin state, resource references, preload/load calls, scene paths, names, or directory proximity.

Such information may remain source metadata or scanner evidence, separate from declared architecture.

## 11. Source provenance

All source URIs MUST be repository-relative or portable logical URIs. Absolute POSIX paths and Windows drive paths are rejected.

All emitted sources MUST use:

```json
{
  "kind": "adapter",
  "adapter": "godot-mssp-export"
}
```

A supplied revision is copied as provenance and is not independently verified.

## 12. Determinism and conformance

For identical input and options, serialized output MUST be identical.

The output MUST pass the Godot input Schema, Intermediate Model Schema, adapter descriptor Schema, adapter conformance evaluation, stable ordering, identity, and portable provenance checks.

## 13. Interpretation boundary

A valid output means that a valid semantic export was deterministically translated.

It does not prove:

- Godot editor or runtime equivalence;
- scene or resource loadability;
- successful import, export, execution, or deployment;
- signal, group, inheritance, autoload, or plugin correctness;
- tool-script, GDScript, C#, GDExtension, or native-code safety;
- semantic or runtime compatibility;
- SCL approval;
- runtime loading or deployment readiness.
