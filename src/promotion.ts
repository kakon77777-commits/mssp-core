import { createHash } from "node:crypto";
import type { RepositoryClassificationReport } from "./classification-report.js";
import type { RepositoryClassificationSuggestion } from "./classification.js";
import type { IntermediateCandidate } from "./model.js";
import type { RepositoryScanModel } from "./scanner.js";
import {
  formatSchemaErrors,
  validateModuleSchema,
  validatePromotionReviewSchema,
} from "./schema.js";
import { MSSP_LAYERS } from "./types.js";
import type {
  MsspLayer,
  MsspModuleManifest,
} from "./types.js";

export const MSSP_PROMOTION_REVIEW_VERSION = "0.2" as const;
export const MSSP_PROMOTION_REVIEW_KIND = "mssp-candidate-promotion-review" as const;

export type CandidatePromotionDecision = "approve" | "reject" | "defer";
export type PromotionActorKind = "human" | "agent";
export type PromotionReadinessStatus = "not-approved" | "blocked" | "eligible";

export interface PromotionActor {
  id: string;
  kind: PromotionActorKind;
}

export interface CandidatePromotionReview {
  schemaVersion: typeof MSSP_PROMOTION_REVIEW_VERSION;
  kind: typeof MSSP_PROMOTION_REVIEW_KIND;
  reviewId: string;
  generatedBy: {
    name: string;
    version: string;
    adapter: "promotion-review";
  };
  sourceModel: {
    projectId: string;
    projectName: string;
    scannerAdapter: string;
    truncated: boolean;
    revision?: string;
  };
  candidate: {
    id: string;
    name: string;
    path: string;
    boundaryKind: IntermediateCandidate["boundaryKind"];
    boundaryConfidence: number;
    fileCount: number;
    sourceFileCount: number;
    languages: string[];
  };
  classification: RepositoryClassificationSuggestion;
  review: {
    actor: PromotionActor;
    reviewedAt: string;
    outcome: CandidatePromotionDecision;
    selectedLayer?: MsspLayer;
    rationale: string;
    conditions: string[];
  };
  contractDraft?: MsspModuleManifest;
  promotion: {
    status: PromotionReadinessStatus;
    blockers: string[];
    requiresIndependentApproval: true;
  };
}

export interface BuildCandidatePromotionReviewOptions {
  candidate: string;
  decision: CandidatePromotionDecision;
  reviewerId: string;
  reviewerKind?: PromotionActorKind;
  reviewedAt?: string;
  selectedLayer?: MsspLayer;
  rationale: string;
  conditions?: string[];
  implementationName?: string;
  implementationVersion?: string;
}

export interface PromoteCandidateOptions {
  approverId: string;
  approverKind?: PromotionActorKind;
  approvedAt?: string;
  rationale: string;
}

function isMsspLayer(value: string): value is MsspLayer {
  return (MSSP_LAYERS as readonly string[]).includes(value);
}

function requireText(value: string, label: string): string {
  const text = value.trim();
  if (!text) throw new Error(`${label} must not be empty.`);
  return text;
}

function requireTimestamp(value: string, label: string): string {
  if (Number.isNaN(Date.parse(value))) {
    throw new Error(`${label} must be an ISO-8601 timestamp.`);
  }
  return value;
}

function slug(value: string): string {
  const normalized = value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
  return normalized || "candidate";
}

function reviewId(parts: readonly string[]): string {
  const digest = createHash("sha256").update(parts.join("\u0000")).digest("hex").slice(0, 16);
  return `promotion-review.${digest}`;
}

function cloneManifest(manifest: MsspModuleManifest): MsspModuleManifest {
  return JSON.parse(JSON.stringify(manifest)) as MsspModuleManifest;
}

function containsTodo(value: unknown): boolean {
  if (typeof value === "string") return /\bTODO\b/i.test(value);
  if (Array.isArray(value)) return value.some(containsTodo);
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some(containsTodo);
  }
  return false;
}

function buildContractDraft(
  candidate: IntermediateCandidate,
  layer: MsspLayer,
  id: string,
): MsspModuleManifest {
  const draft: MsspModuleManifest = {
    schemaVersion: "0.1",
    id: `${layer.toLowerCase()}.${slug(candidate.path === "." ? candidate.name : candidate.path)}`,
    name: candidate.name,
    version: "0.1.0",
    layer,
    purpose: `TODO: define the approved system purpose of ${candidate.path}.`,
    inputs: [],
    outputs: [],
    requires: {
      modules: [],
      tools: [],
      data: [],
    },
    permissions: {
      may: [],
      mayNot: [],
    },
    riskLevel: "L1",
    failureModes: ["TODO: define representative failure modes."],
    validation: ["TODO: define objective validation criteria."],
    tests: ["TODO: add representative contract and behavior tests."],
    compatibility: {
      mssp: ">=0.1 <0.3",
    },
    changeImpact: {
      affects: [],
      affectedBy: [],
      notes: ["Generated from a candidate promotion review; complete every TODO before promotion."],
    },
    metadata: {
      promotionDraft: {
        reviewId: id,
        candidateId: candidate.id,
        candidatePath: candidate.path,
      },
    },
  };

  if (layer !== "FMS" && layer !== "SCL") {
    draft.entry = candidate.path === "."
      ? "TODO: define module entry"
      : `${candidate.path}/TODO-entry`;
  }
  if (layer === "TMS") {
    draft.activateWhen = ["TODO: define an explicit activation condition."];
  }
  return draft;
}

function findCandidate(
  model: RepositoryScanModel,
  selector: string,
): IntermediateCandidate {
  const candidate = model.candidates.find((value) =>
    value.id === selector || value.path === selector
  );
  if (!candidate) {
    throw new Error(`Unknown candidate '${selector}'. Use an exact candidate id or path from mssp scan.`);
  }
  return candidate;
}

function findSuggestion(
  report: RepositoryClassificationReport,
  candidateId: string,
): RepositoryClassificationSuggestion {
  const suggestion = report.classification.suggestions.find((value) =>
    value.candidateId === candidateId
  );
  if (!suggestion) {
    throw new Error(`Classification report has no suggestion for '${candidateId}'.`);
  }
  return suggestion;
}

export function promotionBlockers(review: CandidatePromotionReview): string[] {
  const blockers: string[] = [];
  if (review.review.outcome !== "approve") {
    blockers.push("Review outcome is not approve.");
    return blockers;
  }
  if (!review.review.selectedLayer) blockers.push("Approved review has no selected layer.");
  if (!review.contractDraft) {
    blockers.push("Approved review has no module contract draft.");
    return blockers;
  }

  const valid = validateModuleSchema(review.contractDraft);
  if (!valid) {
    blockers.push(...formatSchemaErrors(validateModuleSchema.errors).map((error) =>
      `Module schema: ${error}`
    ));
  }
  if (review.review.selectedLayer && review.contractDraft.layer !== review.review.selectedLayer) {
    blockers.push("Contract draft layer does not match the reviewed selected layer.");
  }
  if (containsTodo(review.contractDraft)) {
    blockers.push("Contract draft still contains TODO placeholders.");
  }
  if (review.sourceModel.truncated) {
    blockers.push("Source repository scan was truncated.");
  }
  if (review.review.conditions.length > 0) {
    blockers.push("Review conditions remain unresolved.");
  }
  if (!review.contractDraft.maintainer?.trim()) {
    blockers.push("Contract draft has no maintainer.");
  }
  if (
    review.contractDraft.layer !== "FMS"
    && review.contractDraft.layer !== "SCL"
    && !review.contractDraft.entry?.trim()
  ) {
    blockers.push("Executable module layer has no entry path.");
  }
  if (review.contractDraft.layer === "TMS" && !review.contractDraft.activateWhen?.length) {
    blockers.push("TMS contract has no activation condition.");
  }
  if (!review.contractDraft.failureModes.length) blockers.push("Contract has no failure modes.");
  if (!review.contractDraft.validation.length) blockers.push("Contract has no validation criteria.");
  if (!review.contractDraft.tests.length) blockers.push("Contract has no representative tests.");
  if (
    (review.contractDraft.layer === "FMS" || review.contractDraft.layer === "SCL")
    && review.candidate.sourceFileCount > 0
  ) {
    blockers.push(`${review.contractDraft.layer} promotion cannot include an executable source-bearing candidate.`);
  }
  return [...new Set(blockers)].sort((a, b) => a.localeCompare(b));
}

export function buildCandidatePromotionReview(
  model: RepositoryScanModel,
  classificationReport: RepositoryClassificationReport,
  options: BuildCandidatePromotionReviewOptions,
): CandidatePromotionReview {
  const candidate = findCandidate(model, requireText(options.candidate, "candidate"));
  const suggestion = findSuggestion(classificationReport, candidate.id);
  const reviewerId = requireText(options.reviewerId, "reviewerId");
  const rationale = requireText(options.rationale, "rationale");
  const reviewedAt = requireTimestamp(options.reviewedAt ?? new Date().toISOString(), "reviewedAt");
  const reviewerKind = options.reviewerKind ?? "human";

  if (reviewerId === classificationReport.generatedBy.adapter) {
    throw new Error("The classification adapter cannot review its own suggestion.");
  }
  if (options.decision === "approve" && !options.selectedLayer) {
    throw new Error("An approve decision requires an explicit selectedLayer.");
  }
  if (options.decision !== "approve" && options.selectedLayer) {
    throw new Error("Only an approve decision may select a layer.");
  }

  const id = reviewId([
    model.project.id,
    model.discovery.revision ?? "",
    candidate.id,
    reviewerId,
    options.decision,
    options.selectedLayer ?? "",
    rationale,
    reviewedAt,
  ]);
  const sourceModel: CandidatePromotionReview["sourceModel"] = {
    projectId: model.project.id,
    projectName: model.project.name,
    scannerAdapter: model.generatedBy.adapter,
    truncated: model.discovery.truncated,
  };
  if (model.discovery.revision) sourceModel.revision = model.discovery.revision;

  const review: CandidatePromotionReview = {
    schemaVersion: MSSP_PROMOTION_REVIEW_VERSION,
    kind: MSSP_PROMOTION_REVIEW_KIND,
    reviewId: id,
    generatedBy: {
      name: options.implementationName ?? "@evemisslab/mssp-core",
      version: options.implementationVersion ?? "0.1.0",
      adapter: "promotion-review",
    },
    sourceModel,
    candidate: {
      id: candidate.id,
      name: candidate.name,
      path: candidate.path,
      boundaryKind: candidate.boundaryKind,
      boundaryConfidence: candidate.boundaryConfidence,
      fileCount: candidate.fileCount,
      sourceFileCount: candidate.sourceFileCount,
      languages: [...candidate.languages],
    },
    classification: JSON.parse(JSON.stringify(suggestion)) as RepositoryClassificationSuggestion,
    review: {
      actor: {
        id: reviewerId,
        kind: reviewerKind,
      },
      reviewedAt,
      outcome: options.decision,
      rationale,
      conditions: [...(options.conditions ?? [])],
    },
    promotion: {
      status: "not-approved",
      blockers: [],
      requiresIndependentApproval: true,
    },
  };

  if (options.selectedLayer) review.review.selectedLayer = options.selectedLayer;
  if (options.decision === "approve" && options.selectedLayer) {
    review.contractDraft = buildContractDraft(candidate, options.selectedLayer, id);
  }

  const blockers = promotionBlockers(review);
  review.promotion = {
    status: options.decision !== "approve"
      ? "not-approved"
      : blockers.length
        ? "blocked"
        : "eligible",
    blockers,
    requiresIndependentApproval: true,
  };

  if (!validatePromotionReviewSchema(review)) {
    throw new Error(`Promotion review schema failure: ${formatSchemaErrors(validatePromotionReviewSchema.errors).join("; ")}`);
  }
  return review;
}

export function parseCandidatePromotionReview(value: unknown): CandidatePromotionReview {
  if (!validatePromotionReviewSchema(value)) {
    throw new Error(`Invalid promotion review: ${formatSchemaErrors(validatePromotionReviewSchema.errors).join("; ")}`);
  }
  return value as CandidatePromotionReview;
}

export function promoteCandidateReview(
  review: CandidatePromotionReview,
  options: PromoteCandidateOptions,
): MsspModuleManifest {
  parseCandidatePromotionReview(review);
  const approverId = requireText(options.approverId, "approverId");
  const rationale = requireText(options.rationale, "approval rationale");
  const approvedAt = requireTimestamp(options.approvedAt ?? new Date().toISOString(), "approvedAt");
  const approverKind = options.approverKind ?? "human";

  if (approverId === review.review.actor.id) {
    throw new Error("Final approver must be different from the classification reviewer.");
  }
  if (approverId === review.generatedBy.adapter) {
    throw new Error("The workflow adapter cannot approve its own promotion output.");
  }

  const blockers = promotionBlockers(review);
  if (blockers.length) {
    throw new Error(`Candidate promotion is blocked: ${blockers.join(" ")}`);
  }
  if (!review.contractDraft) {
    throw new Error("Candidate promotion is blocked: no contract draft.");
  }

  const manifest = cloneManifest(review.contractDraft);
  manifest.metadata = {
    ...(manifest.metadata ?? {}),
    promotion: {
      reviewId: review.reviewId,
      candidateId: review.candidate.id,
      candidatePath: review.candidate.path,
      reviewer: review.review.actor,
      approver: {
        id: approverId,
        kind: approverKind,
      },
      approvedAt,
      rationale,
      sourceRevision: review.sourceModel.revision ?? null,
    },
  };

  if (!validateModuleSchema(manifest)) {
    throw new Error(`Promoted module schema failure: ${formatSchemaErrors(validateModuleSchema.errors).join("; ")}`);
  }
  return manifest;
}

export function parseMsspLayer(value: string): MsspLayer {
  if (!isMsspLayer(value)) {
    throw new Error(`Unknown MSSP layer '${value}'. Expected one of ${MSSP_LAYERS.join(", ")}.`);
  }
  return value;
}
