# MSSP Diagnostic Protocol v0.2

**Status:** Draft, implemented by MSSP Core  
**Protocol version:** `0.2`  
**Primary schema:** `schemas/diagnostic.schema.json`

## 1. Purpose

The MSSP Diagnostic Protocol is the common output contract for validators, repository scanners, IDE integrations, agents, adapters, island tests, and future runtime-governance tools.

A consumer MUST use the stable `code` field to identify diagnostic meaning. It MUST NOT parse human-readable messages as a machine interface.

The protocol separates:

- implementation-internal identifiers;
- stable public MSSP codes;
- human-readable messages;
- source locations;
- evidence;
- related modules;
- suggested actions;
- command-level summary and metadata.

## 2. Envelope

```json
{
  "schemaVersion": "0.2",
  "implementation": {
    "name": "@evemisslab/mssp-core",
    "version": "0.1.0"
  },
  "command": "lint",
  "ok": false,
  "summary": {
    "errors": 1,
    "warnings": 0,
    "info": 0,
    "total": 1
  },
  "diagnostics": [],
  "metadata": {}
}
```

`metadata` is command-specific. `lint` may report project identity, `island` may report tested TMS identifiers, and future scanners may report repository revision and adapter identity.

## 3. Diagnostic object

```json
{
  "code": "MSSP_FMS_001",
  "legacyCode": "E_FMS_EXECUTABLE",
  "severity": "error",
  "message": "FMS must remain pure metadata; executable source was found.",
  "location": {
    "file": "FMS/bad.ts"
  },
  "evidence": [
    {
      "kind": "source",
      "message": "Executable extension .ts was found.",
      "file": "FMS/bad.ts"
    }
  ],
  "suggestedActions": [
    "Move executable source out of FMS and update the module index."
  ]
}
```

Required fields:

- `code`;
- `severity`;
- `message`.

Optional fields:

- `legacyCode`;
- `location`;
- `moduleId`;
- `relatedModules`;
- `evidence`;
- `suggestedActions`.

## 4. Stable namespaces

| Namespace | Meaning |
|---|---|
| `MSSP_SCHEMA_*` | Project or module schema violations |
| `MSSP_PROJECT_*` | Project discovery and loading |
| `MSSP_LAYER_*` | Layer configuration and placement |
| `MSSP_FMS_*` | FMS purity and consistency |
| `MSSP_MODULE_*` | Module identity and entry contracts |
| `MSSP_DEP_*` | Dependency identity, direction, and cycles |
| `MSSP_TMS_0**` | General TMS contracts |
| `MSSP_TMS_1**` | TMS island conformance |
| `MSSP_VT_*` | MSSP-VT compatibility and impact |
| `MSSP_CLI_*` | CLI invocation and command failures |
| `MSSP_INTERNAL_*` | Unregistered implementation diagnostics |

A published code MUST NOT be reused for a different meaning.

## 5. v0.1 migration

MSSP Core v0.1 exposed internal codes such as `E_FMS_EXECUTABLE`, `E_LAYER_DEPENDENCY`, and `W_CHANGE_IMPACT_UNKNOWN`.

Protocol v0.2 emits a stable public `code` and preserves the previous identifier in `legacyCode`:

```text
E_FMS_EXECUTABLE
→ code: MSSP_FMS_001
→ legacyCode: E_FMS_EXECUTABLE
```

Internal TypeScript APIs retain the existing identifiers during the v0.2 transition. External JSON consumers SHOULD migrate to `diagnostics[].code`.

## 6. Current code registry

| Legacy code | Public code | Meaning |
|---|---|---|
| `E_PROJECT_SCHEMA` | `MSSP_SCHEMA_001` | Project manifest schema violation |
| `E_MODULE_SCHEMA` | `MSSP_SCHEMA_002` | Module manifest schema violation |
| `E_PROJECT_LOAD` | `MSSP_PROJECT_001` | Project loading failed |
| `E_LAYER_PATH_MISSING` | `MSSP_LAYER_001` | Configured layer path missing |
| `E_LAYER_UNCONFIGURED` | `MSSP_LAYER_002` | Declared layer not configured |
| `E_LAYER_PLACEMENT` | `MSSP_LAYER_003` | Module outside declared layer |
| `E_METADATA_EXECUTABLE_ENTRY` | `MSSP_LAYER_004` | Declarative layer has executable entry |
| `E_FMS_EXECUTABLE`, `W_FMS_EXECUTABLE` | `MSSP_FMS_001` | Executable source inside FMS |
| `E_ENTRY_MISSING` | `MSSP_MODULE_001` | Declared entry missing |
| `E_MODULE_ID_DUPLICATE` | `MSSP_MODULE_002` | Duplicate module identity |
| `E_DEPENDENCY_UNKNOWN` | `MSSP_DEP_001` | Unknown dependency |
| `E_LAYER_DEPENDENCY`, `W_LAYER_DEPENDENCY` | `MSSP_DEP_002` | Invalid dependency direction |
| `E_DEPENDENCY_CYCLE` | `MSSP_DEP_003` | Runtime dependency cycle |
| `E_TMS_ACTIVATION_MISSING` | `MSSP_TMS_001` | TMS activation missing |
| `E_TMS_FAILURE_MODES_MISSING` | `MSSP_TMS_002` | TMS failure modes missing |
| `E_TMS_VALIDATION_MISSING` | `MSSP_TMS_003` | TMS validation missing |
| `E_TMS_TESTS_MISSING` | `MSSP_TMS_004` | TMS tests missing |
| `E_ISLAND_TARGET` | `MSSP_TMS_101` | Island target missing |
| `E_ISLAND_UNKNOWN_DEPENDENCY` | `MSSP_TMS_102` | Island dependency unknown |
| `E_ISLAND_NON_SMS_DEPENDENCY` | `MSSP_TMS_103` | Island depends on non-SMS module |
| `E_ISLAND_NO_ACTIVATION` | `MSSP_TMS_104` | Island activation missing |
| `E_ISLAND_NO_TESTS` | `MSSP_TMS_105` | Island tests missing |
| `E_ISLAND_NO_VALIDATION` | `MSSP_TMS_106` | Island validation missing |
| `E_ISLAND_NO_FAILURE_MODE` | `MSSP_TMS_107` | Island failure mode missing |
| `W_CHANGE_IMPACT_UNKNOWN` | `MSSP_VT_001` | Unknown MSSP-VT relation |
| `E_CLI` | `MSSP_CLI_001` | CLI execution failed |

## 7. Evidence requirements

Future repository intelligence and AI-assisted classification MUST emit evidence rather than unsupported conclusions.

Evidence should identify:

- what was observed;
- where it was observed;
- which module it concerns;
- which policy or invariant it supports;
- any machine-readable supporting data.

Confidence alone is not evidence.

## 8. Compatibility

During `0.x`, breaking changes require migration notes. Public codes must not silently change meaning.

For `1.x`, required envelope fields and public code meanings are stable within the major version. Incompatible semantic changes require `2.0`.
