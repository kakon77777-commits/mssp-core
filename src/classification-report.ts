import {
  classifyRepositoryCandidates,
} from "./classification.js";
import type {
  RepositoryClassificationAnalysis,
} from "./classification.js";
import type { RepositoryScanModel } from "./scanner.js";

export const MSSP_CLASSIFICATION_REPORT_VERSION = "0.2" as const;
export const MSSP_CLASSIFICATION_REPORT_KIND = "mssp-classification-suggestions" as const;

export interface RepositoryClassificationReport {
  schemaVersion: typeof MSSP_CLASSIFICATION_REPORT_VERSION;
  kind: typeof MSSP_CLASSIFICATION_REPORT_KIND;
  generatedBy: {
    name: string;
    version: string;
    adapter: "static-layer-classifier";
  };
  sourceModel: {
    projectId: string;
    projectName: string;
    scannerAdapter: string;
    truncated: boolean;
    revision?: string;
  };
  classification: RepositoryClassificationAnalysis;
}

export interface RepositoryClassificationReportOptions {
  implementationName?: string;
  implementationVersion?: string;
}

export function buildRepositoryClassificationReport(
  model: RepositoryScanModel,
  options: RepositoryClassificationReportOptions = {},
): RepositoryClassificationReport {
  const sourceModel: RepositoryClassificationReport["sourceModel"] = {
    projectId: model.project.id,
    projectName: model.project.name,
    scannerAdapter: model.generatedBy.adapter,
    truncated: model.discovery.truncated,
  };
  if (model.discovery.revision) sourceModel.revision = model.discovery.revision;

  return {
    schemaVersion: MSSP_CLASSIFICATION_REPORT_VERSION,
    kind: MSSP_CLASSIFICATION_REPORT_KIND,
    generatedBy: {
      name: options.implementationName ?? "@evemisslab/mssp-core",
      version: options.implementationVersion ?? "0.1.0",
      adapter: "static-layer-classifier",
    },
    sourceModel,
    classification: classifyRepositoryCandidates(
      model.candidates,
      model.discovery.dependencies,
      model.discovery.workspaces,
      model.discovery.truncated,
    ),
  };
}
