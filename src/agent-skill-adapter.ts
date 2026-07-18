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
import { formatSchemaErrors, validateAgentSkillAdapterInputSchema } from "./schema.js";
import type { MsspLayer } from "./types.js";

export const AGENT_SKILL_ADAPTER_ID = "agent-skill-mssp-export" as const;
export const AGENT_SKILL_ADAPTER_INPUT_KIND = "agent-skill-mssp-export" as const;
export const AGENT_SKILL_ADAPTER_INPUT_VERSION = "0.3" as const;

export type AgentSkillComponentKind =
  | "agent"
  | "skill"
  | "tool"
  | "prompt"
  | "workflow"
  | "resource"
  | "memory-policy"
  | "guardrail"
  | "handoff"
  | "evaluator"
  | "service"
  | "other";

export interface AgentSkillMsspComponent {
  id: string;
  name: string;
  skillKind: AgentSkillComponentKind;
  skillIdentity: string;
  sourceUri: string;
  namespace?: string;
  manifestPath?: string;
  entrypoint?: string;
  promptPath?: string;
  inputSchemaUri?: string;
  outputSchemaUri?: string;
  toolNames?: string[];
  capabilities?: string[];
  triggers?: string[];
  requiredPermissions?: string[];
  deniedPermissions?: string[];
  delegatesTo?: string[];
  readsResources?: string[];
  writesResources?: string[];
  modelConstraints?: string[];
  purpose?: string;
  declaration?: DeclarativeModuleDeclaration;
  candidate?: DeclarativeCandidateHint;
  metadata?: Record<string, unknown>;
}

export interface AgentSkillMsspExport {
  schemaVersion: typeof AGENT_SKILL_ADAPTER_INPUT_VERSION;
  kind: typeof AGENT_SKILL_ADAPTER_INPUT_KIND;
  project: {
    id: string;
    name: string;
    version: string;
    description?: string;
    sourceUri: string;
    framework?: string;
    frameworkVersion?: string;
    manifestFormat?: string;
    manifestVersion?: string;
    protocolVersion?: string;
    executionEnvironments?: string[];
    modelFamilies?: string[];
    transports?: string[];
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
  components: AgentSkillMsspComponent[];
}

export const AGENT_SKILL_ADAPTER_DESCRIPTOR: MsspAdapterDescriptor = {
  schemaVersion: "0.3",
  kind: "mssp-adapter-descriptor",
  id: AGENT_SKILL_ADAPTER_ID,
  name: "Agent Skill MSSP Semantic Export Adapter",
  version: "0.3.0",
  sourceEcosystem: "Agent Skill",
  input: {
    kind: AGENT_SKILL_ADAPTER_INPUT_KIND,
    schemaVersion: AGENT_SKILL_ADAPTER_INPUT_VERSION,
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

export function parseAgentSkillMsspExport(value: unknown): AgentSkillMsspExport {
  if (!validateAgentSkillAdapterInputSchema(value)) {
    throw new Error(`Invalid Agent Skill MSSP export: ${formatSchemaErrors(validateAgentSkillAdapterInputSchema.errors).join("; ")}`);
  }
  const input = value as AgentSkillMsspExport;
  assertUniqueAdapterValues(input.components.map((component) => component.id), "Agent Skill components");
  assertUniqueAdapterValues(input.components.map((component) => component.skillIdentity), "Agent Skill identities");
  assertUniqueAdapterValues((input.layers ?? []).map((layer) => layer.id), "Agent Skill layers");
  assertUniqueAdapterValues((input.policies ?? []).map((policy) => policy.id), "Agent Skill policies");
  return input;
}

function defaultBoundaryKind(component: DeclarativeAdapterComponent): CandidateBoundaryKind {
  if (
    component.sourceKind === "agent"
    || component.sourceKind === "skill"
    || component.sourceKind === "tool"
    || component.sourceKind === "workflow"
    || component.sourceKind === "service"
  ) {
    return "package";
  }
  return "source-root";
}

function mapComponent(component: AgentSkillMsspComponent): DeclarativeAdapterComponent {
  const metadata: Record<string, unknown> = {
    ...(component.metadata ?? {}),
    agentSkillIdentity: component.skillIdentity,
  };
  if (component.namespace !== undefined) metadata.agentSkillNamespace = component.namespace;
  if (component.manifestPath !== undefined) metadata.agentSkillManifestPath = component.manifestPath;
  if (component.entrypoint !== undefined) metadata.agentSkillEntrypoint = component.entrypoint;
  if (component.promptPath !== undefined) metadata.agentSkillPromptPath = component.promptPath;
  if (component.inputSchemaUri !== undefined) metadata.agentSkillInputSchemaUri = component.inputSchemaUri;
  if (component.outputSchemaUri !== undefined) metadata.agentSkillOutputSchemaUri = component.outputSchemaUri;
  if (component.toolNames !== undefined) metadata.agentSkillToolNames = sorted(component.toolNames);
  if (component.capabilities !== undefined) metadata.agentSkillCapabilities = sorted(component.capabilities);
  if (component.triggers !== undefined) metadata.agentSkillTriggers = sorted(component.triggers);
  if (component.requiredPermissions !== undefined) {
    metadata.agentSkillRequiredPermissions = sorted(component.requiredPermissions);
  }
  if (component.deniedPermissions !== undefined) {
    metadata.agentSkillDeniedPermissions = sorted(component.deniedPermissions);
  }
  if (component.delegatesTo !== undefined) metadata.agentSkillDelegatesTo = sorted(component.delegatesTo);
  if (component.readsResources !== undefined) {
    metadata.agentSkillReadsResources = sorted(component.readsResources);
  }
  if (component.writesResources !== undefined) {
    metadata.agentSkillWritesResources = sorted(component.writesResources);
  }
  if (component.modelConstraints !== undefined) {
    metadata.agentSkillModelConstraints = sorted(component.modelConstraints);
  }

  const mapped: DeclarativeAdapterComponent = {
    id: component.id,
    name: component.name,
    sourceKind: component.skillKind,
    sourceUri: component.sourceUri,
    metadata,
  };
  if (component.purpose !== undefined) mapped.purpose = component.purpose;
  if (component.declaration !== undefined) mapped.declaration = component.declaration;
  if (component.candidate !== undefined) mapped.candidate = component.candidate;
  return mapped;
}

function toDeclarativeExport(input: AgentSkillMsspExport): DeclarativeAdapterExport {
  const projectMetadata: Record<string, unknown> = {
    ...(input.project.metadata ?? {}),
  };
  if (input.project.framework !== undefined) {
    projectMetadata.agentSkillFramework = input.project.framework;
  }
  if (input.project.frameworkVersion !== undefined) {
    projectMetadata.agentSkillFrameworkVersion = input.project.frameworkVersion;
  }
  if (input.project.manifestFormat !== undefined) {
    projectMetadata.agentSkillManifestFormat = input.project.manifestFormat;
  }
  if (input.project.manifestVersion !== undefined) {
    projectMetadata.agentSkillManifestVersion = input.project.manifestVersion;
  }
  if (input.project.protocolVersion !== undefined) {
    projectMetadata.agentSkillProtocolVersion = input.project.protocolVersion;
  }
  if (input.project.executionEnvironments !== undefined) {
    projectMetadata.agentSkillExecutionEnvironments = sorted(input.project.executionEnvironments);
  }
  if (input.project.modelFamilies !== undefined) {
    projectMetadata.agentSkillModelFamilies = sorted(input.project.modelFamilies);
  }
  if (input.project.transports !== undefined) {
    projectMetadata.agentSkillTransports = sorted(input.project.transports);
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

function adaptParsedAgentSkillExport(
  input: AgentSkillMsspExport,
  options: MsspAdapterOptions = {},
): MsspIntermediateModel {
  return buildDeclarativeAdapterModel(
    toDeclarativeExport(input),
    {
      adapterId: AGENT_SKILL_ADAPTER_ID,
      inputKind: AGENT_SKILL_ADAPTER_INPUT_KIND,
      sourceLabel: "Agent Skill",
      candidatePrefix: "candidate.agent-skill.",
      defaultLanguage: "json",
      componentKindMetadataKey: "agentSkillComponentKind",
      defaultBoundaryKind,
    },
    options,
  );
}

export const AGENT_SKILL_ADAPTER: MsspAdapter<unknown> = {
  descriptor: AGENT_SKILL_ADAPTER_DESCRIPTOR,
  adapt(input: unknown, options: MsspAdapterOptions = {}): MsspIntermediateModel {
    return adaptParsedAgentSkillExport(parseAgentSkillMsspExport(input), options);
  },
};

export function adaptAgentSkillMsspExport(
  input: unknown,
  options: MsspAdapterOptions = {},
): MsspIntermediateModel {
  return runAdapter(AGENT_SKILL_ADAPTER, input, options);
}
