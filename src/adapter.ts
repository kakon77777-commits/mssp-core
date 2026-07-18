import {
  formatSchemaErrors,
  validateAdapterDescriptorSchema,
  validateIntermediateModelSchema,
} from "./schema.js";
import type {
  ModelSourceReference,
  MsspIntermediateModel,
} from "./model.js";

export const MSSP_ADAPTER_CONTRACT_VERSION = "0.3" as const;
export const MSSP_ADAPTER_DESCRIPTOR_KIND = "mssp-adapter-descriptor" as const;

export interface MsspAdapterDescriptor {
  schemaVersion: typeof MSSP_ADAPTER_CONTRACT_VERSION;
  kind: typeof MSSP_ADAPTER_DESCRIPTOR_KIND;
  id: string;
  name: string;
  version: string;
  sourceEcosystem: string;
  input: {
    kind: string;
    schemaVersion: string;
    format: string;
  };
  output: {
    kind: "mssp-intermediate-model";
    schemaVersion: "0.2";
  };
  capabilities: {
    modules: boolean;
    candidates: boolean;
    relations: boolean;
    policies: boolean;
    evidence: boolean;
  };
  invariants: {
    deterministic: true;
    readOnly: true;
    noExecution: true;
    noNetwork: true;
    autoPromotion: false;
    autoMutation: false;
  };
}

export interface MsspAdapterOptions {
  revision?: string;
}

export interface MsspAdapter<Input> {
  descriptor: MsspAdapterDescriptor;
  adapt(input: Input, options?: MsspAdapterOptions): MsspIntermediateModel;
}

export interface AdapterConformanceReport {
  schemaVersion: typeof MSSP_ADAPTER_CONTRACT_VERSION;
  kind: "mssp-adapter-conformance";
  adapter: string;
  ok: boolean;
  issues: string[];
}

function relationKey(relation: MsspIntermediateModel["relations"][number]): string {
  return `${relation.kind}\u0000${relation.from}\u0000${relation.to}`;
}

function isSorted(values: readonly string[]): boolean {
  return values.every((value, index) => index === 0 || values[index - 1]!.localeCompare(value) <= 0);
}

function duplicateValues(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates].sort((a, b) => a.localeCompare(b));
}

function collectSources(model: MsspIntermediateModel): ModelSourceReference[] {
  const sources: ModelSourceReference[] = [model.project.source];
  for (const layer of model.layers) sources.push(layer.source);
  for (const module of model.modules) {
    sources.push(module.source);
    for (const evidence of module.evidence) {
      if (evidence.source) sources.push(evidence.source);
    }
  }
  for (const candidate of model.candidates) {
    sources.push(candidate.source);
    for (const evidence of candidate.evidence) {
      if (evidence.source) sources.push(evidence.source);
    }
  }
  for (const relation of model.relations) {
    sources.push(relation.source);
    for (const evidence of relation.evidence) {
      if (evidence.source) sources.push(evidence.source);
    }
  }
  for (const policy of model.policies) sources.push(policy.source);
  return sources;
}

function portableUri(uri: string): boolean {
  return !uri.startsWith("/")
    && !/^[A-Za-z]:[\\/]/.test(uri)
    && !uri.includes("\\");
}

export function validateAdapterDescriptor(
  descriptor: unknown,
): descriptor is MsspAdapterDescriptor {
  return validateAdapterDescriptorSchema(descriptor);
}

export function evaluateAdapterConformance(
  descriptor: MsspAdapterDescriptor,
  model: MsspIntermediateModel,
): AdapterConformanceReport {
  const issues: string[] = [];

  if (!validateAdapterDescriptorSchema(descriptor)) {
    issues.push(...formatSchemaErrors(validateAdapterDescriptorSchema.errors).map((issue) => `descriptor ${issue}`));
  }
  if (!validateIntermediateModelSchema(model)) {
    issues.push(...formatSchemaErrors(validateIntermediateModelSchema.errors).map((issue) => `output ${issue}`));
  }
  if (model.generatedBy.adapter !== descriptor.id) {
    issues.push(`generatedBy.adapter must equal '${descriptor.id}'.`);
  }

  const moduleIds = model.modules.map((module) => module.id);
  const candidateIds = model.candidates.map((candidate) => candidate.id);
  const relationKeys = model.relations.map(relationKey);
  const layerIds = model.layers.map((layer) => layer.id);
  const policyIds = model.policies.map((policy) => policy.id);

  for (const [label, values] of [
    ["modules", moduleIds],
    ["candidates", candidateIds],
    ["relations", relationKeys],
    ["layers", layerIds],
    ["policies", policyIds],
  ] as const) {
    if (!isSorted(values)) issues.push(`${label} must use deterministic lexical ordering.`);
    const duplicates = duplicateValues(values);
    if (duplicates.length) issues.push(`${label} contains duplicate identities: ${duplicates.join(", ")}.`);
  }

  const crossKindDuplicates = moduleIds.filter((id) => candidateIds.includes(id));
  if (crossKindDuplicates.length) {
    issues.push(`module and candidate identities overlap: ${crossKindDuplicates.join(", ")}.`);
  }

  for (const source of collectSources(model)) {
    if (source.kind !== "adapter") {
      issues.push(`adapter output source '${source.uri}' must use kind 'adapter'.`);
    }
    if (source.adapter !== descriptor.id) {
      issues.push(`adapter output source '${source.uri}' must identify adapter '${descriptor.id}'.`);
    }
    if (!portableUri(source.uri)) {
      issues.push(`adapter output source '${source.uri}' must be portable and use forward slashes.`);
    }
  }

  return {
    schemaVersion: MSSP_ADAPTER_CONTRACT_VERSION,
    kind: "mssp-adapter-conformance",
    adapter: descriptor.id,
    ok: issues.length === 0,
    issues: [...new Set(issues)].sort((a, b) => a.localeCompare(b)),
  };
}

export function runAdapter<Input>(
  adapter: MsspAdapter<Input>,
  input: Input,
  options: MsspAdapterOptions = {},
): MsspIntermediateModel {
  if (!validateAdapterDescriptorSchema(adapter.descriptor)) {
    throw new Error(`Invalid adapter descriptor: ${formatSchemaErrors(validateAdapterDescriptorSchema.errors).join("; ")}`);
  }
  const model = adapter.adapt(input, options);
  const report = evaluateAdapterConformance(adapter.descriptor, model);
  if (!report.ok) {
    throw new Error(`Adapter '${adapter.descriptor.id}' produced non-conformant output: ${report.issues.join("; ")}`);
  }
  return model;
}
