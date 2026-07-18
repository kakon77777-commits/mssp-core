import { relative } from "node:path";
import type {
  Diagnostic,
  DiagnosticEvidence,
  DiagnosticLevel,
} from "./types.js";

export const MSSP_DIAGNOSTIC_PROTOCOL_VERSION = "0.2" as const;
export const MSSP_CORE_IMPLEMENTATION = {
  name: "@evemisslab/mssp-core",
  version: "0.1.0",
} as const;

export interface DiagnosticCodeDefinition {
  code: string;
  title: string;
  category: string;
  defaultActions?: readonly string[];
}

export const DIAGNOSTIC_CODE_REGISTRY = {
  E_LAYER_PATH_MISSING: {
    code: "MSSP_LAYER_001",
    title: "Configured layer path is missing",
    category: "layer",
    defaultActions: ["Create the configured layer path or update mssp.yaml."],
  },
  E_FMS_EXECUTABLE: {
    code: "MSSP_FMS_001",
    title: "Executable source exists inside FMS",
    category: "fms",
    defaultActions: ["Move executable source out of FMS and update the module index."],
  },
  W_FMS_EXECUTABLE: {
    code: "MSSP_FMS_001",
    title: "Executable source exists inside FMS",
    category: "fms",
    defaultActions: ["Move executable source out of FMS and update the module index."],
  },
  E_LAYER_UNCONFIGURED: {
    code: "MSSP_LAYER_002",
    title: "Declared layer is not configured",
    category: "layer",
  },
  E_LAYER_PLACEMENT: {
    code: "MSSP_LAYER_003",
    title: "Module is outside its declared layer path",
    category: "layer",
  },
  E_METADATA_EXECUTABLE_ENTRY: {
    code: "MSSP_LAYER_004",
    title: "Declarative layer declares an executable entry",
    category: "layer",
  },
  E_ENTRY_MISSING: {
    code: "MSSP_MODULE_001",
    title: "Declared module entry is missing",
    category: "module",
  },
  E_MODULE_ID_DUPLICATE: {
    code: "MSSP_MODULE_002",
    title: "Module identifier is duplicated",
    category: "module",
  },
  E_TMS_ACTIVATION_MISSING: {
    code: "MSSP_TMS_001",
    title: "TMS activation contract is missing",
    category: "tms",
  },
  E_TMS_FAILURE_MODES_MISSING: {
    code: "MSSP_TMS_002",
    title: "TMS failure modes are missing",
    category: "tms",
  },
  E_TMS_VALIDATION_MISSING: {
    code: "MSSP_TMS_003",
    title: "TMS validation rules are missing",
    category: "tms",
  },
  E_TMS_TESTS_MISSING: {
    code: "MSSP_TMS_004",
    title: "TMS representative tests are missing",
    category: "tms",
  },
  E_DEPENDENCY_UNKNOWN: {
    code: "MSSP_DEP_001",
    title: "Module dependency is unknown",
    category: "dependency",
  },
  E_LAYER_DEPENDENCY: {
    code: "MSSP_DEP_002",
    title: "Runtime dependency violates layer policy",
    category: "dependency",
  },
  W_LAYER_DEPENDENCY: {
    code: "MSSP_DEP_002",
    title: "Runtime dependency violates layer policy",
    category: "dependency",
  },
  E_DEPENDENCY_CYCLE: {
    code: "MSSP_DEP_003",
    title: "Runtime dependency cycle exists",
    category: "dependency",
  },
  W_CHANGE_IMPACT_UNKNOWN: {
    code: "MSSP_VT_001",
    title: "MSSP-VT relation references an unknown module",
    category: "version-tracking",
  },
  E_PROJECT_SCHEMA: {
    code: "MSSP_SCHEMA_001",
    title: "Project manifest violates the schema",
    category: "schema",
  },
  E_MODULE_SCHEMA: {
    code: "MSSP_SCHEMA_002",
    title: "Module manifest violates the schema",
    category: "schema",
  },
  E_PROJECT_LOAD: {
    code: "MSSP_PROJECT_001",
    title: "MSSP project could not be loaded",
    category: "project",
  },
  E_ISLAND_TARGET: {
    code: "MSSP_TMS_101",
    title: "Selected island target does not exist",
    category: "tms-island",
  },
  E_ISLAND_UNKNOWN_DEPENDENCY: {
    code: "MSSP_TMS_102",
    title: "Island dependency is unknown",
    category: "tms-island",
  },
  E_ISLAND_NON_SMS_DEPENDENCY: {
    code: "MSSP_TMS_103",
    title: "Island depends on a non-SMS module",
    category: "tms-island",
  },
  E_ISLAND_NO_ACTIVATION: {
    code: "MSSP_TMS_104",
    title: "Island has no activation contract",
    category: "tms-island",
  },
  E_ISLAND_NO_TESTS: {
    code: "MSSP_TMS_105",
    title: "Island has no representative tests",
    category: "tms-island",
  },
  E_ISLAND_NO_VALIDATION: {
    code: "MSSP_TMS_106",
    title: "Island has no validation contract",
    category: "tms-island",
  },
  E_ISLAND_NO_FAILURE_MODE: {
    code: "MSSP_TMS_107",
    title: "Island has no failure-mode contract",
    category: "tms-island",
  },
  E_CLI: {
    code: "MSSP_CLI_001",
    title: "CLI execution failed",
    category: "cli",
  },
} as const satisfies Record<string, DiagnosticCodeDefinition>;

const FALLBACK_DIAGNOSTIC: DiagnosticCodeDefinition = {
  code: "MSSP_INTERNAL_001",
  title: "Unregistered implementation diagnostic",
  category: "internal",
  defaultActions: ["Report the legacy diagnostic code to the implementation maintainer."],
};

export interface ProtocolDiagnosticLocation {
  file?: string;
  path?: string;
  line?: number;
  column?: number;
}

export interface ProtocolDiagnosticEvidence {
  kind: DiagnosticEvidence["kind"];
  message: string;
  file?: string;
  moduleId?: string;
  data?: Record<string, unknown>;
}

export interface ProtocolDiagnostic {
  code: string;
  legacyCode?: string;
  severity: DiagnosticLevel;
  message: string;
  location?: ProtocolDiagnosticLocation;
  moduleId?: string;
  relatedModules?: string[];
  evidence?: ProtocolDiagnosticEvidence[];
  suggestedActions?: string[];
}

export interface DiagnosticSummary {
  errors: number;
  warnings: number;
  info: number;
  total: number;
}

export interface DiagnosticEnvelope {
  schemaVersion: typeof MSSP_DIAGNOSTIC_PROTOCOL_VERSION;
  implementation: typeof MSSP_CORE_IMPLEMENTATION;
  command: string;
  ok: boolean;
  summary: DiagnosticSummary;
  diagnostics: ProtocolDiagnostic[];
  metadata?: Record<string, unknown>;
}

export interface DiagnosticEnvelopeInput {
  command: string;
  ok: boolean;
  diagnostics: readonly Diagnostic[];
  root?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export function getDiagnosticDefinition(legacyCode: string): DiagnosticCodeDefinition {
  return DIAGNOSTIC_CODE_REGISTRY[legacyCode as keyof typeof DIAGNOSTIC_CODE_REGISTRY]
    ?? FALLBACK_DIAGNOSTIC;
}

export function getCanonicalDiagnosticCode(legacyCode: string): string {
  return getDiagnosticDefinition(legacyCode).code;
}

function normalizeFile(file: string, root?: string): string {
  if (!root) return file;
  const value = relative(root, file);
  return value || ".";
}

function serializeEvidence(
  evidence: readonly DiagnosticEvidence[],
  root?: string,
): ProtocolDiagnosticEvidence[] {
  return evidence.map((item) => {
    const output: ProtocolDiagnosticEvidence = {
      kind: item.kind,
      message: item.message,
    };
    if (item.file) output.file = normalizeFile(item.file, root);
    if (item.moduleId) output.moduleId = item.moduleId;
    if (item.data) output.data = item.data;
    return output;
  });
}

export function serializeDiagnostic(
  diagnostic: Diagnostic,
  root?: string,
): ProtocolDiagnostic {
  const definition = getDiagnosticDefinition(diagnostic.code);
  const output: ProtocolDiagnostic = {
    code: definition.code,
    legacyCode: diagnostic.code,
    severity: diagnostic.level,
    message: diagnostic.message,
  };

  const location: ProtocolDiagnosticLocation = {};
  if (diagnostic.file) location.file = normalizeFile(diagnostic.file, root);
  if (diagnostic.path) location.path = diagnostic.path;
  if (diagnostic.line !== undefined) location.line = diagnostic.line;
  if (diagnostic.column !== undefined) location.column = diagnostic.column;
  if (Object.keys(location).length > 0) output.location = location;

  if (diagnostic.moduleId) output.moduleId = diagnostic.moduleId;
  if (diagnostic.relatedModules?.length) {
    output.relatedModules = [...diagnostic.relatedModules];
  }
  if (diagnostic.evidence?.length) {
    output.evidence = serializeEvidence(diagnostic.evidence, root);
  }

  const actions = diagnostic.suggestedActions ?? definition.defaultActions;
  if (actions?.length) output.suggestedActions = [...actions];

  return output;
}

export function summarizeDiagnostics(
  diagnostics: readonly Diagnostic[],
): DiagnosticSummary {
  const summary: DiagnosticSummary = {
    errors: 0,
    warnings: 0,
    info: 0,
    total: diagnostics.length,
  };
  for (const diagnostic of diagnostics) {
    if (diagnostic.level === "error") summary.errors += 1;
    else if (diagnostic.level === "warning") summary.warnings += 1;
    else summary.info += 1;
  }
  return summary;
}

export function createDiagnosticEnvelope(
  input: DiagnosticEnvelopeInput,
): DiagnosticEnvelope {
  const envelope: DiagnosticEnvelope = {
    schemaVersion: MSSP_DIAGNOSTIC_PROTOCOL_VERSION,
    implementation: MSSP_CORE_IMPLEMENTATION,
    command: input.command,
    ok: input.ok,
    summary: summarizeDiagnostics(input.diagnostics),
    diagnostics: input.diagnostics.map((diagnostic) =>
      serializeDiagnostic(diagnostic, input.root),
    ),
  };
  if (input.metadata && Object.keys(input.metadata).length > 0) {
    envelope.metadata = input.metadata;
  }
  return envelope;
}
