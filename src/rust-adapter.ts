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
import { formatSchemaErrors, validateRustAdapterInputSchema } from "./schema.js";
import type { MsspLayer } from "./types.js";

export const RUST_ADAPTER_ID = "rust-mssp-export" as const;
export const RUST_ADAPTER_INPUT_KIND = "rust-mssp-export" as const;
export const RUST_ADAPTER_INPUT_VERSION = "0.3" as const;

export type RustComponentKind =
  | "workspace"
  | "package"
  | "crate"
  | "library"
  | "binary"
  | "proc-macro"
  | "build-script"
  | "example"
  | "test"
  | "benchmark"
  | "service"
  | "plugin"
  | "other";

export interface RustMsspComponent {
  id: string;
  name: string;
  rustKind: RustComponentKind;
  cargoIdentity: string;
  sourceUri: string;
  packageName?: string;
  crateName?: string;
  targetName?: string;
  crateRoot?: string;
  edition?: string;
  crateTypes?: string[];
  features?: string[];
  targetTriples?: string[];
  purpose?: string;
  declaration?: DeclarativeModuleDeclaration;
  candidate?: DeclarativeCandidateHint;
  metadata?: Record<string, unknown>;
}

export interface RustMsspExport {
  schemaVersion: typeof RUST_ADAPTER_INPUT_VERSION;
  kind: typeof RUST_ADAPTER_INPUT_KIND;
  project: {
    id: string;
    name: string;
    version: string;
    description?: string;
    sourceUri: string;
    workspaceName?: string;
    cargoResolver?: string;
    rustVersion?: string;
    edition?: string;
    toolchainChannel?: string;
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
  components: RustMsspComponent[];
}

export const RUST_ADAPTER_DESCRIPTOR: MsspAdapterDescriptor = {
  schemaVersion: "0.3",
  kind: "mssp-adapter-descriptor",
  id: RUST_ADAPTER_ID,
  name: "Rust MSSP Semantic Export Adapter",
  version: "0.3.0",
  sourceEcosystem: "Rust",
  input: {
    kind: RUST_ADAPTER_INPUT_KIND,
    schemaVersion: RUST_ADAPTER_INPUT_VERSION,
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

export function parseRustMsspExport(value: unknown): RustMsspExport {
  if (!validateRustAdapterInputSchema(value)) {
    throw new Error(`Invalid Rust MSSP export: ${formatSchemaErrors(validateRustAdapterInputSchema.errors).join("; ")}`);
  }
  const input = value as RustMsspExport;
  assertUniqueAdapterValues(input.components.map((component) => component.id), "Rust components");
  assertUniqueAdapterValues(input.components.map((component) => component.cargoIdentity), "Rust Cargo identities");
  assertUniqueAdapterValues((input.layers ?? []).map((layer) => layer.id), "Rust layers");
  assertUniqueAdapterValues((input.policies ?? []).map((policy) => policy.id), "Rust policies");
  return input;
}

function defaultBoundaryKind(component: DeclarativeAdapterComponent): CandidateBoundaryKind {
  if (component.sourceKind === "workspace") return "repository";
  if (
    component.sourceKind === "package"
    || component.sourceKind === "crate"
    || component.sourceKind === "library"
    || component.sourceKind === "binary"
    || component.sourceKind === "proc-macro"
    || component.sourceKind === "service"
    || component.sourceKind === "plugin"
  ) {
    return "package";
  }
  return "source-root";
}

function mapComponent(component: RustMsspComponent): DeclarativeAdapterComponent {
  const metadata: Record<string, unknown> = {
    ...(component.metadata ?? {}),
    rustCargoIdentity: component.cargoIdentity,
  };
  if (component.packageName !== undefined) metadata.rustPackageName = component.packageName;
  if (component.crateName !== undefined) metadata.rustCrateName = component.crateName;
  if (component.targetName !== undefined) metadata.rustTargetName = component.targetName;
  if (component.crateRoot !== undefined) metadata.rustCrateRoot = component.crateRoot;
  if (component.edition !== undefined) metadata.rustEdition = component.edition;
  if (component.crateTypes !== undefined) metadata.rustCrateTypes = sorted(component.crateTypes);
  if (component.features !== undefined) metadata.rustFeatures = sorted(component.features);
  if (component.targetTriples !== undefined) metadata.rustTargetTriples = sorted(component.targetTriples);

  const mapped: DeclarativeAdapterComponent = {
    id: component.id,
    name: component.name,
    sourceKind: component.rustKind,
    sourceUri: component.sourceUri,
    metadata,
  };
  if (component.purpose !== undefined) mapped.purpose = component.purpose;
  if (component.declaration !== undefined) mapped.declaration = component.declaration;
  if (component.candidate !== undefined) mapped.candidate = component.candidate;
  return mapped;
}

function toDeclarativeExport(input: RustMsspExport): DeclarativeAdapterExport {
  const projectMetadata: Record<string, unknown> = {
    ...(input.project.metadata ?? {}),
  };
  if (input.project.workspaceName !== undefined) {
    projectMetadata.rustWorkspaceName = input.project.workspaceName;
  }
  if (input.project.cargoResolver !== undefined) {
    projectMetadata.rustCargoResolver = input.project.cargoResolver;
  }
  if (input.project.rustVersion !== undefined) {
    projectMetadata.rustVersion = input.project.rustVersion;
  }
  if (input.project.edition !== undefined) {
    projectMetadata.rustEdition = input.project.edition;
  }
  if (input.project.toolchainChannel !== undefined) {
    projectMetadata.rustToolchainChannel = input.project.toolchainChannel;
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

function adaptParsedRustExport(
  input: RustMsspExport,
  options: MsspAdapterOptions = {},
): MsspIntermediateModel {
  return buildDeclarativeAdapterModel(
    toDeclarativeExport(input),
    {
      adapterId: RUST_ADAPTER_ID,
      inputKind: RUST_ADAPTER_INPUT_KIND,
      sourceLabel: "Rust",
      candidatePrefix: "candidate.rust.",
      defaultLanguage: "rust",
      componentKindMetadataKey: "rustComponentKind",
      defaultBoundaryKind,
    },
    options,
  );
}

export const RUST_ADAPTER: MsspAdapter<unknown> = {
  descriptor: RUST_ADAPTER_DESCRIPTOR,
  adapt(input: unknown, options: MsspAdapterOptions = {}): MsspIntermediateModel {
    return adaptParsedRustExport(parseRustMsspExport(input), options);
  },
};

export function adaptRustMsspExport(
  input: unknown,
  options: MsspAdapterOptions = {},
): MsspIntermediateModel {
  return runAdapter(RUST_ADAPTER, input, options);
}
