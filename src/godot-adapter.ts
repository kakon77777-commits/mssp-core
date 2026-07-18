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
import { formatSchemaErrors, validateGodotAdapterInputSchema } from "./schema.js";
import type { MsspLayer } from "./types.js";

export const GODOT_ADAPTER_ID = "godot-mssp-export" as const;
export const GODOT_ADAPTER_INPUT_KIND = "godot-mssp-export" as const;
export const GODOT_ADAPTER_INPUT_VERSION = "0.3" as const;

export type GodotComponentKind =
  | "project"
  | "scene"
  | "node"
  | "script"
  | "autoload"
  | "singleton"
  | "addon"
  | "editor-plugin"
  | "resource"
  | "service"
  | "test"
  | "other";

export interface GodotMsspComponent {
  id: string;
  name: string;
  godotKind: GodotComponentKind;
  godotIdentity: string;
  sourceUri: string;
  scenePath?: string;
  scriptPath?: string;
  className?: string;
  baseType?: string;
  nodeType?: string;
  resourceType?: string;
  autoloadName?: string;
  pluginName?: string;
  pluginEnabled?: boolean;
  signals?: string[];
  groups?: string[];
  purpose?: string;
  declaration?: DeclarativeModuleDeclaration;
  candidate?: DeclarativeCandidateHint;
  metadata?: Record<string, unknown>;
}

export interface GodotMsspExport {
  schemaVersion: typeof GODOT_ADAPTER_INPUT_VERSION;
  kind: typeof GODOT_ADAPTER_INPUT_KIND;
  project: {
    id: string;
    name: string;
    version: string;
    description?: string;
    sourceUri: string;
    engineVersion?: string;
    renderer?: string;
    mainScene?: string;
    projectFeatures?: string[];
    scriptingLanguages?: string[];
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
  components: GodotMsspComponent[];
}

export const GODOT_ADAPTER_DESCRIPTOR: MsspAdapterDescriptor = {
  schemaVersion: "0.3",
  kind: "mssp-adapter-descriptor",
  id: GODOT_ADAPTER_ID,
  name: "Godot MSSP Semantic Export Adapter",
  version: "0.3.0",
  sourceEcosystem: "Godot",
  input: {
    kind: GODOT_ADAPTER_INPUT_KIND,
    schemaVersion: GODOT_ADAPTER_INPUT_VERSION,
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

export function parseGodotMsspExport(value: unknown): GodotMsspExport {
  if (!validateGodotAdapterInputSchema(value)) {
    throw new Error(`Invalid Godot MSSP export: ${formatSchemaErrors(validateGodotAdapterInputSchema.errors).join("; ")}`);
  }
  const input = value as GodotMsspExport;
  assertUniqueAdapterValues(input.components.map((component) => component.id), "Godot components");
  assertUniqueAdapterValues(input.components.map((component) => component.godotIdentity), "Godot identities");
  assertUniqueAdapterValues((input.layers ?? []).map((layer) => layer.id), "Godot layers");
  assertUniqueAdapterValues((input.policies ?? []).map((policy) => policy.id), "Godot policies");
  return input;
}

function defaultBoundaryKind(component: DeclarativeAdapterComponent): CandidateBoundaryKind {
  if (component.sourceKind === "project") return "repository";
  if (
    component.sourceKind === "addon"
    || component.sourceKind === "editor-plugin"
    || component.sourceKind === "service"
  ) {
    return "package";
  }
  return "source-root";
}

function mapComponent(component: GodotMsspComponent): DeclarativeAdapterComponent {
  const metadata: Record<string, unknown> = {
    ...(component.metadata ?? {}),
    godotIdentity: component.godotIdentity,
  };
  if (component.scenePath !== undefined) metadata.godotScenePath = component.scenePath;
  if (component.scriptPath !== undefined) metadata.godotScriptPath = component.scriptPath;
  if (component.className !== undefined) metadata.godotClassName = component.className;
  if (component.baseType !== undefined) metadata.godotBaseType = component.baseType;
  if (component.nodeType !== undefined) metadata.godotNodeType = component.nodeType;
  if (component.resourceType !== undefined) metadata.godotResourceType = component.resourceType;
  if (component.autoloadName !== undefined) metadata.godotAutoloadName = component.autoloadName;
  if (component.pluginName !== undefined) metadata.godotPluginName = component.pluginName;
  if (component.pluginEnabled !== undefined) metadata.godotPluginEnabled = component.pluginEnabled;
  if (component.signals !== undefined) metadata.godotSignals = sorted(component.signals);
  if (component.groups !== undefined) metadata.godotGroups = sorted(component.groups);

  const mapped: DeclarativeAdapterComponent = {
    id: component.id,
    name: component.name,
    sourceKind: component.godotKind,
    sourceUri: component.sourceUri,
    metadata,
  };
  if (component.purpose !== undefined) mapped.purpose = component.purpose;
  if (component.declaration !== undefined) mapped.declaration = component.declaration;
  if (component.candidate !== undefined) mapped.candidate = component.candidate;
  return mapped;
}

function toDeclarativeExport(input: GodotMsspExport): DeclarativeAdapterExport {
  const projectMetadata: Record<string, unknown> = {
    ...(input.project.metadata ?? {}),
  };
  if (input.project.engineVersion !== undefined) {
    projectMetadata.godotEngineVersion = input.project.engineVersion;
  }
  if (input.project.renderer !== undefined) {
    projectMetadata.godotRenderer = input.project.renderer;
  }
  if (input.project.mainScene !== undefined) {
    projectMetadata.godotMainScene = input.project.mainScene;
  }
  if (input.project.projectFeatures !== undefined) {
    projectMetadata.godotProjectFeatures = sorted(input.project.projectFeatures);
  }
  if (input.project.scriptingLanguages !== undefined) {
    projectMetadata.godotScriptingLanguages = sorted(input.project.scriptingLanguages);
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

function adaptParsedGodotExport(
  input: GodotMsspExport,
  options: MsspAdapterOptions = {},
): MsspIntermediateModel {
  return buildDeclarativeAdapterModel(
    toDeclarativeExport(input),
    {
      adapterId: GODOT_ADAPTER_ID,
      inputKind: GODOT_ADAPTER_INPUT_KIND,
      sourceLabel: "Godot",
      candidatePrefix: "candidate.godot.",
      defaultLanguage: "gdscript",
      componentKindMetadataKey: "godotComponentKind",
      defaultBoundaryKind,
    },
    options,
  );
}

export const GODOT_ADAPTER: MsspAdapter<unknown> = {
  descriptor: GODOT_ADAPTER_DESCRIPTOR,
  adapt(input: unknown, options: MsspAdapterOptions = {}): MsspIntermediateModel {
    return adaptParsedGodotExport(parseGodotMsspExport(input), options);
  },
};

export function adaptGodotMsspExport(
  input: unknown,
  options: MsspAdapterOptions = {},
): MsspIntermediateModel {
  return runAdapter(GODOT_ADAPTER, input, options);
}
