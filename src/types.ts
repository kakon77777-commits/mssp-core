export const MSSP_LAYERS = [
  "FMS",
  "SCL",
  "SMS",
  "TMS",
  "DMS",
  "ROUTER",
  "RUNTIME",
] as const;

export type MsspLayer = (typeof MSSP_LAYERS)[number];
export type RiskLevel = "L0" | "L1" | "L2" | "L3" | "L4";

export interface LayerPaths {
  FMS: string;
  SCL: string;
  SMS: string;
  TMS: string;
  DMS: string;
  ROUTER?: string;
  RUNTIME?: string;
}

export interface MsspPolicies {
  fmsExecutableFiles: "deny" | "warn";
  tmsDirectDependency: "deny" | "warn";
  smsDependsOnTms: "deny" | "warn";
  requireFmsReview: boolean;
}

export interface MsspProjectManifest {
  schemaVersion: "0.1";
  id: string;
  name: string;
  version: string;
  description?: string;
  layers: LayerPaths;
  policies: MsspPolicies;
  metadata?: Record<string, unknown>;
}

export interface ModuleRequirements {
  modules: string[];
  tools: string[];
  data: string[];
}

export interface ModulePermissions {
  may: string[];
  mayNot: string[];
}

export interface ModuleCompatibility {
  mssp: string;
  modules?: Record<string, string>;
}

export interface ChangeImpact {
  affects: string[];
  affectedBy: string[];
  notes?: string[];
}

export interface MsspModuleManifest {
  schemaVersion: "0.1";
  id: string;
  name: string;
  version: string;
  layer: MsspLayer;
  purpose: string;
  entry?: string;
  activateWhen?: string[];
  inputs: string[];
  outputs: string[];
  requires: ModuleRequirements;
  permissions: ModulePermissions;
  riskLevel: RiskLevel;
  failureModes: string[];
  validation: string[];
  tests: string[];
  compatibility: ModuleCompatibility;
  changeImpact: ChangeImpact;
  maintainer?: string;
  metadata?: Record<string, unknown>;
}

export interface LoadedModule {
  file: string;
  directory: string;
  manifest: MsspModuleManifest;
}

export interface LoadedProject {
  root: string;
  manifestFile: string;
  manifest: MsspProjectManifest;
  modules: LoadedModule[];
}

export type DiagnosticLevel = "error" | "warning";

export interface Diagnostic {
  level: DiagnosticLevel;
  code: string;
  message: string;
  file?: string;
  moduleId?: string;
}

export interface ValidationReport {
  ok: boolean;
  diagnostics: Diagnostic[];
  project?: LoadedProject;
}
