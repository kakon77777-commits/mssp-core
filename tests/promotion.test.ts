import {
  mkdirSync,
  mkdtempSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildRepositoryClassificationReport } from "../src/classification-report.js";
import {
  buildCandidatePromotionReview,
  promotionBlockers,
  promoteCandidateReview,
} from "../src/promotion.js";
import { scanRepository } from "../src/scanner.js";
import {
  validateModuleSchema,
  validatePromotionReviewSchema,
} from "../src/schema.js";

function promotionFixture(): string {
  const root = mkdtempSync(join(tmpdir(), "mssp-promotion-"));
  mkdirSync(join(root, "packages", "plugin", "src"), { recursive: true });
  writeFileSync(join(root, "package.json"), JSON.stringify({
    name: "promotion-demo",
    version: "1.0.0",
    workspaces: ["packages/*"],
  }, null, 2));
  writeFileSync(join(root, "packages", "plugin", "package.json"), JSON.stringify({
    name: "@demo/plugin",
    version: "0.1.0",
  }, null, 2));
  writeFileSync(
    join(root, "packages", "plugin", "src", "index.ts"),
    "export const plugin = true;\n",
  );
  return root;
}

function approvedReview() {
  const model = scanRepository(promotionFixture(), { revision: "promotion-revision" });
  const classification = buildRepositoryClassificationReport(model);
  return buildCandidatePromotionReview(model, classification, {
    candidate: "packages/plugin",
    decision: "approve",
    reviewerId: "architecture-reviewer",
    reviewerKind: "human",
    reviewedAt: "2026-07-18T00:00:00.000Z",
    selectedLayer: "TMS",
    rationale: "The package is independently activated and replaceable.",
  });
}

describe("MSSP candidate-to-module promotion workflow", () => {
  it("creates a schema-valid review record with a blocked contract draft", () => {
    const review = approvedReview();

    expect(review.kind).toBe("mssp-candidate-promotion-review");
    expect(review.review.outcome).toBe("approve");
    expect(review.review.selectedLayer).toBe("TMS");
    expect(review.contractDraft?.layer).toBe("TMS");
    expect(review.promotion.status).toBe("blocked");
    expect(review.promotion.requiresIndependentApproval).toBe(true);
    expect(review.promotion.blockers).toContain("Contract draft still contains TODO placeholders.");
    expect(validatePromotionReviewSchema(review)).toBe(true);
  });

  it("records defer decisions without pretending a module contract exists", () => {
    const model = scanRepository(promotionFixture());
    const classification = buildRepositoryClassificationReport(model);
    const review = buildCandidatePromotionReview(model, classification, {
      candidate: "packages/plugin",
      decision: "defer",
      reviewerId: "architecture-reviewer",
      rationale: "Activation ownership is not known yet.",
      reviewedAt: "2026-07-18T00:00:00.000Z",
    });

    expect(review.contractDraft).toBeUndefined();
    expect(review.promotion.status).toBe("not-approved");
    expect(review.promotion.blockers).toEqual(["Review outcome is not approve."]);
    expect(validatePromotionReviewSchema(review)).toBe(true);
  });

  it("requires a different final approver", () => {
    const review = approvedReview();

    expect(() => promoteCandidateReview(review, {
      approverId: "architecture-reviewer",
      approvedAt: "2026-07-18T01:00:00.000Z",
      rationale: "Final approval.",
    })).toThrow("Final approver must be different");
  });

  it("promotes only a completed contract and preserves review provenance", () => {
    const review = approvedReview();
    const draft = review.contractDraft;
    if (!draft) throw new Error("Expected contract draft.");

    draft.purpose = "Provide an optional export capability.";
    draft.entry = "packages/plugin/src/index.ts";
    draft.activateWhen = ["request.output == plugin-format"];
    draft.inputs = ["validated-document"];
    draft.outputs = ["plugin-output"];
    draft.permissions.may = ["read-validated-document", "write-output"];
    draft.permissions.mayNot = ["modify-source", "network"];
    draft.failureModes = ["invalid-input", "output-write-failure"];
    draft.validation = ["output exists", "source remains unchanged"];
    draft.tests = ["exports minimal input", "fails safely on malformed input"];
    draft.maintainer = "example-team";
    draft.changeImpact.notes = ["Reviewed as an optional capability."];
    review.review.conditions = [];

    expect(promotionBlockers(review)).toEqual([]);
    const manifest = promoteCandidateReview(review, {
      approverId: "release-approver",
      approverKind: "human",
      approvedAt: "2026-07-18T01:00:00.000Z",
      rationale: "Contract, tests, and boundaries are complete.",
    });

    expect(validateModuleSchema(manifest)).toBe(true);
    expect(manifest.id).toBe("tms.packages.plugin");
    expect(manifest.metadata?.promotion).toMatchObject({
      reviewId: review.reviewId,
      candidateId: "candidate.packages.plugin",
      candidatePath: "packages/plugin",
      approvedAt: "2026-07-18T01:00:00.000Z",
    });
  });
});
