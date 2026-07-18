import { relative } from "node:path";
import type {
  LoadedProject,
  MsspLayer,
  RiskLevel,
} from "./types.js";

export const MSSP_INTERMEDIATE_MODEL_VERSION = "0.2" as const;
export const MSSP_INTERMEDIATE_MODEL_KIND = "mssp-intermediate-model" as const;

export type ModelSourceKind = "manifest" | "scanner" | "adapter" | "generated";
export type ModelEvidenceKind =
  | "declaration"
  | "source"
  | "dependency"
  | "policy"
  | "inference"
  | "test"
  | "other";

export interface ModelSourceReference {
  kind: ModelSourceKind;
  uri: string;
  format?: string;
  adapter?: string;
  revision?: string;
}

export interface ModelEvidence {
  kind: ModelEvidenceKind;
  message: string;
  source?: ModelSourceReference;
  data?: Record<string, unknown>;
}

export interface IntermediateProjectIdentity {
  id: string;
  name: string;
  version: string;
  description?: string;
  source: ModelSourceReference;
  metadata?: Record<string, unknown>;
}

export interface IntermediateLayer {
  id: MsspLayer;
  path: string;
  source: ModelSourceReference;
}

export interface IntermediateModule {
  id: string;
  name: string;
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
  source: ModelSourceReference;
  evidence: ModelEvidence[];
  metadata?: Record<string, unknown>;
}

export type IntermediateRelationKind = "requires" | "affects" | "affected-by";

export interface IntermediateRelation {
  kind: IntermediateRelationKind;
  from: string;
  to: string;
  source: ModelSourceReference;
  evidence: ModelEvidence[];
}

export interface IntermediatePolicy {
  id: string;
  value: boolean | string;
  source: ModelSourceReference;
}

export type CandidateBoundaryKind =
  | "repository"
  | "package"
  | "source-root"
  | "directory";

export interface IntermediateCandidate {
  id: string;
  name: string;
  path: string;
  boundaryKind: CandidateBoundaryKind;
  boundaryConfidence: number;
  status: "unclassified";
  fileCount: number;
  sourceFileCount: number;
  languages: string[];
  source: ModelSourceReference;
  evidence: ModelEvidence[];
}

export interface IntermediateDiscoveryMarker {
  kind: string;
  ecosystem: string;
  path: string;
  boundaryPath: string;
  name?: string;
  version?: string;
  source: ModelSourceReference;
}

export interface IntermediateDiscoveryLanguage {
  id: string;
  files: number;
  extensions: string[];
}

export interface IntermediateDiscovery {
  root: ".";
  revision?: string;
  truncated: boolean;
  ignoredDirectories: string[];
  inventory: {
    files: number;
    sourceFiles: number;
    languages: IntermediateDiscoveryLanguage[];
  };
  markers: IntermediateDiscoveryMarker[];
}

export interface MsspIntermediateModel {
  schemaVersion: typeof MSSP_INTERMEDIATE_MODEL_VERSION;
  kind: typeof MSSP_INTERMEDIATE_MODEL_KIND;
  generatedBy: {
    name: string;
    version: string;
    adapter: string;
  };
  project: IntermediateProjectIdentity;
  layers: IntermediateLayer[];
  modules: IntermediateModule[];
  candidates: IntermediateCandidate[];
  relations: IntermediateRelation[];
  policies: IntermediatePolicy[];
  discovery?: IntermediateDiscovery;
}

export interface IntermediateModelOptions {
  implementationName?: string;
  implementationVersion?: string;
  adapter?: string;
  revision?: string;
}

function portablePath(root: string, file: string): string {
  const value = relative(root, file).replaceAll("\\", "/");
  return value || ".";
}

function manifestSource(
  root: string,
  file: string,
  revision?: string,
): ModelSourceReference {
  const source: ModelSourceReference = {
    kind: "manifest",
    uri: portablePath(root, file),
    format: file.endsWith(".json") ? "json" : "yaml",
  };
  if (revision) source.revision = revision;
  return source;
}

function sorted(values: readonly string[]): string[] {
  return [...values].sort((a, b) => a.localeCompare(b));
}

function sortedRecord(
  value: Record<string, string> | undefined,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(value ?? {}).sort(([a], [b]) => a.localeCompare(b)),
  );
}

function buildModule(
  project: LoadedProject,
  loadedModule: LoadedProject["modules"][number],
  revision?: string,
): IntermediateModule {
  const { manifest } = loadedModule;
  const source = manifestSource(project.root, loadedModule.file, revision);
  const module: IntermediateModule = {
    id: manifest.id,
    name: manifest.name,
    version: manifest.version,
    layer: manifest.layer,
    purpose: manifest.purpose,
    activation: sorted(manifest.activateWhen ?? []),
    inputs: sorted(manifest.inputs),
    outputs: sorted(manifest.outputs),
    requirements: {
      modules: sorted(manifest.requires.modules),
      tools: sorted(manifest.requires.tools),
      data: sorted(manifest.requires.data),
    },
    permissions: {
      may: sorted(manifest.permissions.may),
      mayNot: sorted(manifest.permissions.mayNot),
    },
    riskLevel: manifest.riskLevel,
    failureModes: sorted(manifest.failureModes),
    validation: sorted(manifest.validation),
    tests: sorted(manifest.tests),
    compatibility: {
      mssp: manifest.compatibility.mssp,
      modules: sortedRecord(manifest.compatibility.modules),
    },
    changeImpact: {
      affects: sorted(manifest.changeImpact.affects),
      affectedBy: sorted(manifest.changeImpact.affectedBy),
      notes: sorted(manifest.changeImpact.notes ?? []),
    },
    source,
    evidence: [{
      kind: "declaration",
      message: `Module ${manifest.id} is declared as ${manifest.layer}.`,
      source,
      data: {
        schemaVersion: manifest.schemaVersion,
      },
    }],
  };
  if (manifest.entry) module.entry = manifest.entry;
  if (manifest.maintainer) module.maintainer = manifest.maintainer;
  if (manifest.metadata) module.metadata = manifest.metadata;
  return module;
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
          message: `${module.id} declares a runtime dependency on ${target}.`,
          source: module.source,
          data: { field: "requires.modules" },
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
          message: `${module.id} declares that it affects ${target}.`,
          source: module.source,
          data: { field: "changeImpact.affects" },
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
          message: `${module.id} declares that it is affected by ${target}.`,
          source: module.source,
          data: { field: "changeImpact.affectedBy" },
        }],
      });
    }
  }
  return relations.sort((a, b) =>
    `${a.kind}\u0000${a.from}\u0000${a.to}`.localeCompare(`${b.kind}\u0000${b.from}\u0000${b.to}`),
  );
}

export function buildIntermediateModel(
  project: LoadedProject,
  options: IntermediateModelOptions = {},
): MsspIntermediateModel {
  const projectSource = manifestSource(project.root, project.manifestFile, options.revision);
  const modules = project.modules
    .map((module) => buildModule(project, module, options.revision))
    .sort((a, b) => a.id.localeCompare(b.id));

  const identity: IntermediateProjectIdentity = {
    id: project.manifest.id,
    name: project.manifest.name,
    version: project.manifest.version,
    source: projectSource,
  };
  if (project.manifest.description) identity.description = project.manifest.description;
  if (project.manifest.metadata) identity.metadata = project.manifest.metadata;

  const layers = Object.entries(project.manifest.layers)
    .filter((entry): entry is [MsspLayer, string] => typeof entry[1] === "string")
    .map(([id, path]) => ({ id, path, source: projectSource }))
    .sort((a, b) => a.id.localeCompare(b.id));

  const policies = Object.entries(project.manifest.policies)
    .map(([id, value]) => ({ id, value, source: projectSource }))
    .sort((a, b) => a.id.localeCompare(b.id));

  return {
    schemaVersion: MSSP_INTERMEDIATE_MODEL_VERSION,
    kind: MSSP_INTERMEDIATE_MODEL_KIND,
    generatedBy: {
      name: options.implementationName ?? "@evemisslab/mssp-core",
      version: options.implementationVersion ?? "0.1.0",
      adapter: options.adapter ?? "mssp-manifest",
    },
    project: identity,
    layers,
    modules,
    candidates: [],
    relations: buildRelations(modules),
    policies,
  };
}
