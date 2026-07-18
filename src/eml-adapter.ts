import {
  runAdapter,
  type MsspAdapter,
  type MsspAdapterDescriptor,
  type MsspAdapterOptions,
} from "./adapter.js";
import {
  MSSP_INTERMEDIATE_MODEL_KIND,
  MSSP_INTERMEDIATE_MODEL_VERSION,
  type CandidateBoundaryKind,
  type IntermediateCandidate,
  type IntermediateLayer,
  type IntermediateModule,
  type IntermediatePolicy,
  type IntermediateRelation,
  type ModelSourceReference,
  type MsspIntermediateModel,
} from "./model.js";
import { formatSchemaErrors, validateEmlAdapterInputSchema } from "./schema.js";
import type { MsspLayer, RiskLevel } from "./types.js";

export const EML_ADAPTER_ID = "eml-mssp-export" as const;
export const EML_ADAPTER_INPUT_KIND = "eml-mssp-export" as const;
export const EML_ADAPTER_INPUT_VERSION = "0.3" as const;

export type EmlSymbolKind =
  | "module"
  | "capability"
  | "policy"
  | "router"
  | "runtime"
  | "diagnostic"
  | "other";

export interface EmlModuleDeclaration {
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

export interface EmlCandidateHint {
  path?: string;
  boundaryKind?: CandidateBoundaryKind;
  boundaryConfidence?: number;
  fileCount?: number;
  sourceFileCount?: number;
  languages?: string[];
}

export interface EmlMsspSymbol {
  id: string;
  name: string;
  symbolKind: EmlSymbolKind;
  sourceUri: string;
  purpose?: string;
  declaration?: EmlModuleDeclaration;
  candidate?: EmlCandidateHint;
  metadata?: Record<string, unknown>;
}

export interface EmlMsspExport {
  schemaVersion: typeof EML_ADAPTER_INPUT_VERSION;
  kind: typeof EML_ADAPTER_INPUT_KIND;
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
  symbols: EmlMsspSymbol[];
}

export const EML_ADAPTER_DESCRIPTOR: MsspAdapterDescriptor = {
  schemaVersion: "0.3",
  kind: "mssp-adapter-descriptor",
  id: EML_ADAPTER_ID,
  name: "EML MSSP Semantic Export Adapter",
  version: "0.3.0",
  sourceEcosystem: "EML",
  input: {
    kind: EML_ADAPTER_INPUT_KIND,
    schemaVersion: EML_ADAPTER_INPUT_VERSION,
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

function sortedRecord(value: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(value).sort(([a], [b]) => a.localeCompare(b)),
  );
}

function normalizeSourceUri(uri: string): string {
  const normalized = uri.replaceAll("\\", "/").replace(/^\.\//, "");
  if (!normalized || normalized.startsWith("/") || /^[A-Za-z]:\//.test(normalized)) {
    throw new Error(`EML sourceUri '${uri}' must be repository-relative or a portable logical URI.`);
  }
  return normalized;
}

function sourceFormat(uri: string): string {
  const logical = uri.split(/[?#]/, 1)[0] ?? uri;
  const fileName = logical.split("/").at(-1) ?? logical;
  const extension = fileName.includes(".") ? fileName.split(".").at(-1) : undefined;
  return extension || "eml";
}

function adapterSource(uri: string, revision?: string): ModelSourceReference {
  const normalized = normalizeSourceUri(uri);
  const source: ModelSourceReference = {
    kind: "adapter",
    uri: normalized,
    format: sourceFormat(normalized),
    adapter: EML_ADAPTER_ID,
  };
  if (revision) source.revision = revision;
  return source;
}

function assertUnique(values: readonly string[], label: string): void {
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

export function parseEmlMsspExport(value: unknown): EmlMsspExport {
  if (!validateEmlAdapterInputSchema(value)) {
    throw new Error(`Invalid EML MSSP export: ${formatSchemaErrors(validateEmlAdapterInputSchema.errors).join("; ")}`);
  }
  const input = value as EmlMsspExport;
  assertUnique(input.symbols.map((symbol) => symbol.id), "EML symbols");
  assertUnique((input.layers ?? []).map((layer) => layer.id), "EML layers");
  assertUnique((input.policies ?? []).map((policy) => policy.id), "EML policies");
  return input;
}

function buildModule(symbol: EmlMsspSymbol, revision?: string): IntermediateModule {
  const declaration = symbol.declaration!;
  const source = adapterSource(symbol.sourceUri, revision);
  const module: IntermediateModule = {
    id: symbol.id,
    name: symbol.name,
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
      message: `EML symbol ${symbol.id} contains a complete explicit MSSP module declaration.`,
      source,
      data: {
        inputKind: EML_ADAPTER_INPUT_KIND,
        symbolKind: symbol.symbolKind,
        authority: "explicit-declaration",
      },
    }],
  };
  if (declaration.entry) module.entry = declaration.entry;
  if (declaration.maintainer) module.maintainer = declaration.maintainer;
  const metadata = {
    ...(symbol.metadata ?? {}),
    ...(declaration.metadata ?? {}),
    emlSymbolKind: symbol.symbolKind,
  };
  if (Object.keys(metadata).length) module.metadata = metadata;
  return module;
}

function candidateId(symbolId: string): string {
  return `candidate.eml.${symbolId}`;
}

function buildCandidate(symbol: EmlMsspSymbol, revision?: string): IntermediateCandidate {
  const source = adapterSource(symbol.sourceUri, revision);
  const hint = symbol.candidate;
  return {
    id: candidateId(symbol.id),
    name: symbol.name,
    path: normalizeSourceUri(hint?.path ?? symbol.sourceUri),
    boundaryKind: hint?.boundaryKind ?? "directory",
    boundaryConfidence: hint?.boundaryConfidence ?? 0.5,
    status: "unclassified",
    fileCount: hint?.fileCount ?? 1,
    sourceFileCount: hint?.sourceFileCount ?? 1,
    languages: sorted(hint?.languages ?? ["eml"]),
    source,
    evidence: [{
      kind: "source",
      message: `EML symbol ${symbol.id} has no complete explicit MSSP module declaration and remains unclassified.`,
      source,
      data: {
        inputKind: EML_ADAPTER_INPUT_KIND,
        symbolId: symbol.id,
        symbolKind: symbol.symbolKind,
        autoPromotion: false,
      },
    }],
  };
}

function buildRelations(modules: readonly IntermediateModule[]): IntermediateRelation[] {
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
          message: `${module.id} explicitly declares an MSSP runtime dependency on ${target} in EML.`,
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
          message: `${module.id} explicitly declares that it affects ${target} in EML.`,
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
          message: `${module.id} explicitly declares that it is affected by ${target} in EML.`,
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

function adaptParsedEmlExport(
  input: EmlMsspExport,
  options: MsspAdapterOptions = {},
): MsspIntermediateModel {
  const projectSource = adapterSource(input.project.sourceUri, options.revision);
  const modules = input.symbols
    .filter((symbol) => symbol.declaration !== undefined)
    .map((symbol) => buildModule(symbol, options.revision))
    .sort((a, b) => a.id.localeCompare(b.id));
  const candidates = input.symbols
    .filter((symbol) => symbol.declaration === undefined)
    .map((symbol) => buildCandidate(symbol, options.revision))
    .sort((a, b) => a.id.localeCompare(b.id));
  const layers: IntermediateLayer[] = (input.layers ?? [])
    .map((layer) => ({
      id: layer.id,
      path: normalizeSourceUri(layer.path),
      source: adapterSource(layer.sourceUri, options.revision),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
  const policies: IntermediatePolicy[] = (input.policies ?? [])
    .map((policy) => ({
      id: policy.id,
      value: policy.value,
      source: adapterSource(policy.sourceUri, options.revision),
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
      sourceKind: EML_ADAPTER_INPUT_KIND,
    },
  };
  if (input.project.description !== undefined) project.description = input.project.description;

  return {
    schemaVersion: MSSP_INTERMEDIATE_MODEL_VERSION,
    kind: MSSP_INTERMEDIATE_MODEL_KIND,
    generatedBy: {
      name: "@evemisslab/mssp-core",
      version: "0.1.0",
      adapter: EML_ADAPTER_ID,
    },
    project,
    layers,
    modules,
    candidates,
    relations: buildRelations(modules),
    policies,
  };
}

export const EML_ADAPTER: MsspAdapter<unknown> = {
  descriptor: EML_ADAPTER_DESCRIPTOR,
  adapt(input: unknown, options: MsspAdapterOptions = {}): MsspIntermediateModel {
    return adaptParsedEmlExport(parseEmlMsspExport(input), options);
  },
};

export function adaptEmlMsspExport(
  input: unknown,
  options: MsspAdapterOptions = {},
): MsspIntermediateModel {
  return runAdapter(EML_ADAPTER, input, options);
}
