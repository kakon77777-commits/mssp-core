import {
  mkdirSync,
  mkdtempSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { buildRepositoryClassificationReport } from "../src/classification-report.js";
import { scanRepository } from "../src/scanner.js";
import { validateClassificationSuggestionsSchema } from "../src/schema.js";

function packageFile(root: string, path: string, name: string, source: string): void {
  mkdirSync(join(root, path, "src"), { recursive: true });
  writeFileSync(join(root, path, "package.json"), JSON.stringify({
    name,
    version: "0.1.0",
  }, null, 2));
  writeFileSync(join(root, path, "src", "index.ts"), source);
}

function classificationFixture(): string {
  const root = mkdtempSync(join(tmpdir(), "mssp-classification-"));
  mkdirSync(join(root, "src"), { recursive: true });
  writeFileSync(join(root, "package.json"), JSON.stringify({
    name: "classification-demo",
    version: "1.0.0",
    workspaces: ["packages/*"],
  }, null, 2));
  writeFileSync(join(root, "src", "index.ts"), [
    "import { core } from '@demo/core';",
    "import { plugin } from '@demo/plugin';",
    "import { diagnostic } from '@demo/diagnostics';",
    "export const app = [core, plugin, diagnostic];",
    "",
  ].join("\n"));

  packageFile(
    root,
    "packages/core",
    "@demo/core",
    "export const core = 'core';\n",
  );
  packageFile(
    root,
    "packages/plugin",
    "@demo/plugin",
    "import { core } from '@demo/core';\nexport const plugin = core;\n",
  );
  packageFile(
    root,
    "packages/diagnostics",
    "@demo/diagnostics",
    "export const diagnostic = 'trace';\n",
  );
  packageFile(
    root,
    "packages/shared",
    "@demo/shared",
    "export const shared = true;\n",
  );
  return root;
}

function suggestion(
  report: ReturnType<typeof buildRepositoryClassificationReport>,
  candidatePath: string,
) {
  return report.classification.suggestions.find((value) => value.candidatePath === candidatePath);
}

describe("MSSP evidence-backed layer classification suggestions", () => {
  it("produces a schema-valid advisory report without promoting candidates", () => {
    const scan = scanRepository(classificationFixture(), { revision: "classification-revision" });
    const report = buildRepositoryClassificationReport(scan);

    expect(report.kind).toBe("mssp-classification-suggestions");
    expect(report.schemaVersion).toBe("0.2");
    expect(report.sourceModel.revision).toBe("classification-revision");
    expect(report.classification.method).toEqual({
      id: "mssp-static-layer-heuristics",
      version: "0.2",
      mode: "advisory",
      autoPromotion: false,
    });
    expect(validateClassificationSuggestionsSchema(report)).toBe(true);
    expect(scan.modules).toEqual([]);
    expect(scan.layers).toEqual([]);
    expect(scan.relations).toEqual([]);
    expect(scan.candidates.every((candidate) => candidate.status === "unclassified")).toBe(true);
  });

  it("suggests SMS only when role and dependency evidence reinforce each other", () => {
    const report = buildRepositoryClassificationReport(scanRepository(classificationFixture()));
    const core = suggestion(report, "packages/core");

    expect(core?.suggestedLayer).toBe("SMS");
    expect(core?.confidence).toBe("high");
    expect(core?.supportScore).toBeGreaterThanOrEqual(0.75);
    expect(core?.supportingEvidence.some((evidence) =>
      evidence.data?.ruleId === "role-token"
    )).toBe(true);
    expect(core?.supportingEvidence.some((evidence) =>
      evidence.data?.ruleId === "shared-inbound-dependency"
    )).toBe(true);
    expect(core?.unresolvedQuestions).toContain(
      "Can a coherent system version operate without this candidate?",
    );
  });

  it("suggests TMS and DMS from explicit role signals while preserving review", () => {
    const report = buildRepositoryClassificationReport(scanRepository(classificationFixture()));
    const plugin = suggestion(report, "packages/plugin");
    const diagnostics = suggestion(report, "packages/diagnostics");

    expect(plugin?.suggestedLayer).toBe("TMS");
    expect(plugin?.confidence).toBe("medium");
    expect(plugin?.status).toBe("review-required");
    expect(plugin?.alternativeLayers.some((value) => value.layer === "SMS")).toBe(true);

    expect(diagnostics?.suggestedLayer).toBe("DMS");
    expect(diagnostics?.confidence).toBe("medium");
    expect(diagnostics?.unresolvedQuestions.some((question) =>
      question.includes("business state")
    )).toBe(true);
  });

  it("keeps weak or aggregate evidence undetermined", () => {
    const report = buildRepositoryClassificationReport(scanRepository(classificationFixture()));
    const shared = suggestion(report, "packages/shared");
    const repository = suggestion(report, ".");
    const sourceRoot = suggestion(report, "src");

    expect(shared?.suggestedLayer).toBe("UNDETERMINED");
    expect(shared?.confidence).toBe("low");
    expect(shared?.supportingEvidence.some((evidence) =>
      evidence.data?.ruleId === "insufficient-dominance"
    )).toBe(true);

    expect(repository?.suggestedLayer).toBe("UNDETERMINED");
    expect(sourceRoot?.suggestedLayer).toBe("UNDETERMINED");
    expect(repository?.supportingEvidence.some((evidence) =>
      evidence.data?.ruleId === "aggregate-boundary-exclusion"
    )).toBe(true);
  });

  it("downgrades every suggestion when the source scan is truncated", () => {
    const scan = scanRepository(classificationFixture());
    scan.discovery.truncated = true;
    const report = buildRepositoryClassificationReport(scan);
    const core = suggestion(report, "packages/core");

    expect(core?.suggestedLayer).toBe("SMS");
    expect(core?.confidence).toBe("low");
    expect(core?.counterEvidence.some((evidence) =>
      evidence.data?.ruleId === "truncated-scan"
    )).toBe(true);
    expect(validateClassificationSuggestionsSchema(report)).toBe(true);
  });
});
