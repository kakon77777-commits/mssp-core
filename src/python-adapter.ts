import {
  runAdapter,
  type MsspAdapter,
  type MsspAdapterDescriptor,
  type MsspAdapterOptions,
} from "./adapter.js";
import {
  assertUniqueAdapterValues,
  buildDeclarativeAdapterModel,
  type DeclarativeAdapterComponent,
  type DeclarativeAdapterExport,
  type DeclarativeCandidateHint,
  type DeclarativeModuleDeclaration,
} from "./declarative-adapter.js";
import {
  MSSP_INTERMEDIATE_MODEL_KIND,
  MSSP_INTERMEDIATE_MODEL_VERSION,
  type CandidateBoundaryKind,
  type MsspIntermediateModel,
} from "./model.js";
import { formatSchemaErrors, validatePythonAdapterInputSchema } from "./schema.js";
import type { MsspLayer } from "./types.js";

export const PYTHON_ADAPTER_ID = "python-mssp-export" as const;
export const PYTHON_ADAPTER_INPUT_KIND = "python-mssp-export" as const;
export const PYTHON_ADAPTER_INPUT_VERSION = "0.3" as const;

export type PythonComponentKind =
  | "distribution"
  | "package"
  | "namespace-package"
  | "module"
  | "plugin"
  | "command"
  | "service"
  | "other";

export interface PythonMsspComponent {
  id: string;
  name: string;
  pythonKind: PythonComponentKind;
  qualifiedName: string;
  sourceUri: string;
  importPath?: string;
  entryPoints?: string[];
  purpose?: string;
  declaration?: DeclarativeModuleDeclaration;
  candidate?: DeclarativeCandidateHint;
  metadata?: Record<string, unknown>;
}

export interface PythonMsspExport {
  schemaVersion: typeof PYTHON_ADAPTER_INPUT_VERSION;
  kind: typeof PYTHON_ADAPTER_INPUT_KIND;
  project: {
    id: string;
    name: string;
    version: string;
    description?: string;
    sourceUri: string;
    distributionName?: string;
    requiresPython?: string;
    buildBackend?: string;
    metadata?: Record<string, unknown>;
  };
  layers?: Array<{
    id: MsspLayer;
    path: string;
    sourceUri: string;
  }>;
  policies?: Array<{
    id: string;
    value: boolean | string;
    sourceUri: string;
  }>;
  components: PythonMsspComponent[];
}

export const PYTHON_ADAPTER_DESCRIPTOR: MsspAdapterDescriptor = {
  schemaVersion: "0.3",
  kind: "mssp-adapter-descriptor",
  id: PYTHON_ADAPTER_ID,
  name: "Python MSSP Semantic Export Adapter",
  version: "0.3.0",
  sourceEcosystem: "Python",
  input: {
    kind: PYTHON_ADAPTER_INPUT_KIND,
    schemaVersion: PYTHON_ADAPTER_INPUT_VERSION,
    format: "json",
  },
  output: {
    kind: MSSP_INTERMEDIATE_MODEL_KIND,
    schemaVersion: MSSP_INTERMEDIATE_MODEL_VERSION,
  },
  capabilities: {
    modules: true,
    candidates: true,
    relations: true,
    policies: true,
    evidence: true,
  },
  invariants: {
    deterministic: true,
    readOnly: true,
    noExecution: true,
    noNetwork: true,
    autoPromotion: false,
    autoMutation: false,
  },
};

function sorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

export function parsePythonMsspExport(value: unknown): PythonMsspExport {
  if (!validatePythonAdapterInputSchema(value)) {
    throw new Error(`Invalid Python MSSP export: ${formatSchemaErrors(validatePythonAdapterInputSchema.errors).join("; ")}`);
  }
  const input = value as PythonMsspExport;
  assertUniqueAdapterValues(input.components.map((component) => component.id), "Python components");
  assertUniqueAdapterValues(input.components.map((component) => component.qualifiedName), "Python qualified names");
  assertUniqueAdapterValues((input.layers ?? []).map((layer) => layer.id), "Python layers");
  assertUniqueAdapterValues((input.policies ?? []).map((policy) => policy.id), "Python policies");
  return input;
}

function defaultBoundaryKind(component: DeclarativeAdapterComponent): CandidateBoundaryKind {
  if (
    component.sourceKind === "distribution"
    || component.sourceKind === "package"
    || component.sourceKind === "namespace-package"
    || component.sourceKind === "plugin"
  ) {
    return "package";
  }
  return "source-root";
}

function mapComponent(component: PythonMsspComponent): DeclarativeAdapterComponent {
  const metadata: Record<string, unknown> = {
    ...(component.metadata ?? {}),
    pythonQualifiedName: component.qualifiedName,
  };
  if (component.importPath !== undefined) metadata.pythonImportPath = component.importPath;
  if (component.entryPoints !== undefined) metadata.pythonEntryPoints = sorted(component.entryPoints);

  const mapped: DeclarativeAdapterComponent = {
    id: component.id,
    name: component.name,
    sourceKind: component.pythonKind,
    sourceUri: component.sourceUri,
    metadata,
  };
  if (component.purpose !== undefined) mapped.purpose = component.purpose;
  if (component.declaration !== undefined) mapped.declaration = component.declaration;
  if (component.candidate !== undefined) mapped.candidate = component.candidate;
  return mapped;
}

function toDeclarativeExport(input: PythonMsspExport): DeclarativeAdapterExport {
  const projectMetadata: Record<string, unknown> = {
    ...(input.project.metadata ?? {}),
  };
  if (input.project.distributionName !== undefined) {
    projectMetadata.pythonDistributionName = input.project.distributionName;
  }
  if (input.project.requiresPython !== undefined) {
    projectMetadata.pythonRequires = input.project.requiresPython;
  }
  if (input.project.buildBackend !== undefined) {
    projectMetadata.pythonBuildBackend = input.project.buildBackend;
  }

  const project: DeclarativeAdapterExport["project"] = {
    id: input.project.id,
    name: input.project.name,
    version: input.project.version,
    sourceUri: input.project.sourceUri,
    metadata: projectMetadata,
  };
  if (input.project.description !== undefined) project.description = input.project.description;

  const output: DeclarativeAdapterExport = {
    project,
    components: input.components.map(mapComponent),
  };
  if (input.layers !== undefined) output.layers = input.layers;
  if (input.policies !== undefined) output.policies = input.policies;
  return output;
}

function adaptParsedPythonExport(
  input: PythonMsspExport,
  options: MsspAdapterOptions = {},
): MsspIntermediateModel {
  return buildDeclarativeAdapterModel(
    toDeclarativeExport(input),
    {
      adapterId: PYTHON_ADAPTER_ID,
      inputKind: PYTHON_ADAPTER_INPUT_KIND,
      sourceLabel: "Python",
      candidatePrefix: "candidate.python.",
      defaultLanguage: "python",
      componentKindMetadataKey: "pythonComponentKind",
      defaultBoundaryKind,
    },
    options,
  );
}

export const PYTHON_ADAPTER: MsspAdapter<unknown> = {
  descriptor: PYTHON_ADAPTER_DESCRIPTOR,
  adapt(input: unknown, options: MsspAdapterOptions = {}): MsspIntermediateModel {
    return adaptParsedPythonExport(parsePythonMsspExport(input), options);
  },
};

export function adaptPythonMsspExport(
  input: unknown,
  options: MsspAdapterOptions = {},
): MsspIntermediateModel {
  return runAdapter(PYTHON_ADAPTER, input, options);
}
