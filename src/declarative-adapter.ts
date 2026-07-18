import type {
  CandidateBoundaryKind,
  IntermediateCandidate,
  IntermediateLayer,
  IntermediateModule,
  IntermediatePolicy,
  IntermediateRelation,
  ModelSourceReference,
  MsspIntermediateModel,
} from "./model.js";
import {
  MSSP_INTERMEDIATE_MODEL_KIND,
  MSSP_INTERMEDIATE_MODEL_VERSION,
} from "./model.js";
import type { MsspAdapterOptions } from "./adapter.js";
import type { MsspLayer, RiskLevel } from "./types.js";

export interface DeclarativeModuleDeclaration {
  version: string;
  layer: MsspLayer;
  purpose: string;
  entry?: string;
  activation: string[];
  inputs: string[];
  outputs: string[];
  requirements: {
    modules: string[];
    tools: string[];
    data: string[];
  };
  permissions: {
    may: string[];
    mayNot: string[];
  };
  riskLevel: RiskLevel;
  failureModes: string[];
  validation: string[];
  tests: string[];
  compatibility: {
    mssp: string;
    modules: Record<string, string>;
  };
  changeImpact: {
    affects: string[];
    affectedBy: string[];
    notes: string[];
  };
  maintainer?: string;
  metadata?: Record<string, unknown>;
}

export interface DeclarativeCandidateHint {
  path?: string;
  boundaryKind?: CandidateBoundaryKind;
  boundaryConfidence?: number;
  fileCount?: number;
  sourceFileCount?: number;
  languages?: string[];
}

export interface DeclarativeAdapterComponent {
  id: string;
  name: string;
  sourceKind: string;
  sourceUri: string;
  purpose?: string;
  declaration?: DeclarativeModuleDeclaration;
  candidate?: DeclarativeCandidateHint;
  metadata?: Record<string, unknown>;
}

export interface DeclarativeAdapterExport {
  project: {
    id: string;
    name: string;
    version: string;
    description?: string;
    sourceUri: string;
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
  components: DeclarativeAdapterComponent[];
}

export interface DeclarativeAdapterConfig {
  adapterId: string;
  inputKind: string;
  sourceLabel: string;
  candidatePrefix: string;
  defaultLanguage: string;
  componentKindMetadataKey: string;
  defaultBoundaryKind(component: DeclarativeAdapterComponent): CandidateBoundaryKind;
}

function sorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function sortedRecord(value: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(value).sort(([a], [b]) => a.localeCompare(b)),
  );
}

export function normalizeAdapterSourceUri(uri: string, sourceLabel: string): string {
  const normalized = uri.replaceAll("\\", "/").replace(/^\.\//, "");
  if (!normalized || normalized.startsWith("/") || /^[A-Za-z]:\//.test(normalized)) {
    throw new Error(`${sourceLabel} sourceUri '${uri}' must be repository-relative or a portable logical URI.`);
  }
  return normalized;
}

function sourceFormat(uri: string, fallback: string): string {
  const logical = uri.split(/[?#]/, 1)[0] ?? uri;
  const fileName = logical.split("/").at(-1) ?? logical;
  const extension = fileName.includes(".") ? fileName.split(".").at(-1) : undefined;
  return extension || fallback;
}

function adapterSource(
  uri: string,
  config: DeclarativeAdapterConfig,
  revision?: string,
): ModelSourceReference {
  const normalized = normalizeAdapterSourceUri(uri, config.sourceLabel);
  const source: ModelSourceReference = {
    kind: "adapter",
    uri: normalized,
    format: sourceFormat(normalized, config.defaultLanguage),
    adapter: config.adapterId,
  };
  if (revision) source.revision = revision;
  return source;
}

export function assertUniqueAdapterValues(values: readonly string[], label: string): void {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  if (duplicates.size) {
    throw new Error(`${label} contains duplicate identities: ${[...duplicates].sort().join(", ")}.`);
  }
}

function buildModule(
  component: DeclarativeAdapterComponent,
  config: DeclarativeAdapterConfig,
  revision?: string,
): IntermediateModule {
  const declaration = component.declaration!;
  const source = adapterSource(component.sourceUri, config, revision);
  const module: IntermediateModule = {
    id: component.id,
    name: component.name,
    version: declaration.version,
    layer: declaration.layer,
    purpose: declaration.purpose,
    activation: sorted(declaration.activation),
    inputs: sorted(declaration.inputs),
    outputs: sorted(declaration.outputs),
    requirements: {
      modules: sorted(declaration.requirements.modules),
      tools: sorted(declaration.requirements.tools),
      data: sorted(declaration.requirements.data),
    },
    permissions: {
      may: sorted(declaration.permissions.may),
      mayNot: sorted(declaration.permissions.mayNot),
    },
    riskLevel: declaration.riskLevel,
    failureModes: sorted(declaration.failureModes),
    validation: sorted(declaration.validation),
    tests: sorted(declaration.tests),
    compatibility: {
      mssp: declaration.compatibility.mssp,
      modules: sortedRecord(declaration.compatibility.modules),
    },
    changeImpact: {
      affects: sorted(declaration.changeImpact.affects),
      affectedBy: sorted(declaration.changeImpact.affectedBy),
      notes: sorted(declaration.changeImpact.notes),
    },
    source,
    evidence: [{
      kind: "declaration",
      message: `${config.sourceLabel} component ${component.id} contains a complete explicit MSSP module declaration.`,
      source,
      data: {
        inputKind: config.inputKind,
        sourceKind: component.sourceKind,
        authority: "explicit-declaration",
      },
    }],
  };
  if (declaration.entry) module.entry = declaration.entry;
  if (declaration.maintainer) module.maintainer = declaration.maintainer;
  const metadata = {
    ...(component.metadata ?? {}),
    ...(declaration.metadata ?? {}),
    [config.componentKindMetadataKey]: component.sourceKind,
  };
  if (Object.keys(metadata).length) module.metadata = metadata;
  return module;
}

function buildCandidate(
  component: DeclarativeAdapterComponent,
  config: DeclarativeAdapterConfig,
  revision?: string,
): IntermediateCandidate {
  const source = adapterSource(component.sourceUri, config, revision);
  const hint = component.candidate;
  return {
    id: `${config.candidatePrefix}${component.id}`,
    name: component.name,
    path: normalizeAdapterSourceUri(hint?.path ?? component.sourceUri, config.sourceLabel),
    boundaryKind: hint?.boundaryKind ?? config.defaultBoundaryKind(component),
    boundaryConfidence: hint?.boundaryConfidence ?? 0.5,
    status: "unclassified",
    fileCount: hint?.fileCount ?? 1,
    sourceFileCount: hint?.sourceFileCount ?? 1,
    languages: sorted(hint?.languages ?? [config.defaultLanguage]),
    source,
    evidence: [{
      kind: "source",
      message: `${config.sourceLabel} component ${component.id} has no complete explicit MSSP module declaration and remains unclassified.`,
      source,
      data: {
        inputKind: config.inputKind,
        componentId: component.id,
        sourceKind: component.sourceKind,
        autoPromotion: false,
        ...(component.purpose === undefined ? {} : { purpose: component.purpose }),
        ...(component.metadata ?? {}),
      },
    }],
  };
}

function buildRelations(
  modules: readonly IntermediateModule[],
  sourceLabel: string,
): IntermediateRelation[] {
  const relations: IntermediateRelation[] = [];
  for (const module of modules) {
    for (const target of module.requirements.modules) {
      relations.push({
        kind: "requires",
        from: module.id,
        to: target,
        source: module.source,
        evidence: [{
          kind: "dependency",
          message: `${module.id} explicitly declares an MSSP runtime dependency on ${target} in ${sourceLabel}.`,
          source: module.source,
          data: { field: "declaration.requirements.modules" },
        }],
      });
    }
    for (const target of module.changeImpact.affects) {
      relations.push({
        kind: "affects",
        from: module.id,
        to: target,
        source: module.source,
        evidence: [{
          kind: "declaration",
          message: `${module.id} explicitly declares that it affects ${target} in ${sourceLabel}.`,
          source: module.source,
          data: { field: "declaration.changeImpact.affects" },
        }],
      });
    }
    for (const target of module.changeImpact.affectedBy) {
      relations.push({
        kind: "affected-by",
        from: module.id,
        to: target,
        source: module.source,
        evidence: [{
          kind: "declaration",
          message: `${module.id} explicitly declares that it is affected by ${target} in ${sourceLabel}.`,
          source: module.source,
          data: { field: "declaration.changeImpact.affectedBy" },
        }],
      });
    }
  }
  return relations.sort((a, b) =>
    `${a.kind}\u0000${a.from}\u0000${a.to}`.localeCompare(`${b.kind}\u0000${b.from}\u0000${b.to}`),
  );
}

export function buildDeclarativeAdapterModel(
  input: DeclarativeAdapterExport,
  config: DeclarativeAdapterConfig,
  options: MsspAdapterOptions = {},
): MsspIntermediateModel {
  assertUniqueAdapterValues(input.components.map((component) => component.id), `${config.sourceLabel} components`);
  assertUniqueAdapterValues((input.layers ?? []).map((layer) => layer.id), `${config.sourceLabel} layers`);
  assertUniqueAdapterValues((input.policies ?? []).map((policy) => policy.id), `${config.sourceLabel} policies`);

  const projectSource = adapterSource(input.project.sourceUri, config, options.revision);
  const modules = input.components
    .filter((component) => component.declaration !== undefined)
    .map((component) => buildModule(component, config, options.revision))
    .sort((a, b) => a.id.localeCompare(b.id));
  const candidates = input.components
    .filter((component) => component.declaration === undefined)
    .map((component) => buildCandidate(component, config, options.revision))
    .sort((a, b) => a.id.localeCompare(b.id));
  const layers: IntermediateLayer[] = (input.layers ?? [])
    .map((layer) => ({
      id: layer.id,
      path: normalizeAdapterSourceUri(layer.path, config.sourceLabel),
      source: adapterSource(layer.sourceUri, config, options.revision),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
  const policies: IntermediatePolicy[] = (input.policies ?? [])
    .map((policy) => ({
      id: policy.id,
      value: policy.value,
      source: adapterSource(policy.sourceUri, config, options.revision),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  const project: MsspIntermediateModel["project"] = {
    id: input.project.id,
    name: input.project.name,
    version: input.project.version,
    source: projectSource,
    metadata: {
      ...(input.project.metadata ?? {}),
      adapterContract: "0.3",
      sourceKind: config.inputKind,
    },
  };
  if (input.project.description !== undefined) project.description = input.project.description;

  return {
    schemaVersion: MSSP_INTERMEDIATE_MODEL_VERSION,
    kind: MSSP_INTERMEDIATE_MODEL_KIND,
    generatedBy: {
      name: "@evemisslab/mssp-core",
      version: "0.1.0",
      adapter: config.adapterId,
    },
    project,
    layers,
    modules,
    candidates,
    relations: buildRelations(modules, config.sourceLabel),
    policies,
  };
}
