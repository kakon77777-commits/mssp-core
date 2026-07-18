import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { loadProject } from "../src/io.js";
import {
  evaluateNumericVersionRange,
  evaluateRouterCondition,
  evaluateRouterContracts,
  parseRouterRequest,
  type MsspRouterRequest,
} from "../src/router.js";
import {
  validateRouterEvaluationSchema,
  validateRouterRequestSchema,
} from "../src/schema.js";
import type { LoadedModule, LoadedProject } from "../src/types.js";

const example = resolve("examples/hello-mssp");

function fixtureRequest(): MsspRouterRequest {
  return parseRouterRequest(
    JSON.parse(readFileSync(resolve(example, "router-request.json"), "utf8")) as unknown,
  );
}

function clonedProject(): LoadedProject {
  return structuredClone(loadProject(example));
}

function uppercaseModule(project: LoadedProject): LoadedModule {
  const module = project.modules.find((item) => item.manifest.id === "plugin.uppercase");
  if (!module) throw new Error("Uppercase fixture module is missing.");
  return module;
}

function addEligibleTms(project: LoadedProject, id: string): LoadedModule {
  const base = structuredClone(uppercaseModule(project));
  base.file = `${base.file}.${id}`;
  base.directory = `${base.directory}-${id}`;
  base.manifest.id = id;
  base.manifest.name = id;
  base.manifest.changeImpact.affectedBy = [];
  project.modules.push(base);
  return base;
}

describe("MSSP Router Contract Evaluator v0.4", () => {
  it("selects exactly one eligible TMS and emits schema-valid output", () => {
    const request = fixtureRequest();
    const report = evaluateRouterContracts(clonedProject(), request, { revision: "router-test" });

    expect(validateRouterRequestSchema(request)).toBe(true);
    expect(validateRouterEvaluationSchema(report)).toBe(true);
    expect(report.schemaVersion).toBe("0.4");
    expect(report.kind).toBe("mssp-router-evaluation-report");
    expect(report.summary).toEqual(expect.objectContaining({
      status: "selected",
      ok: true,
      totalCandidates: 1,
      eligible: 1,
      rejected: 0,
      indeterminate: 0,
      selectedModuleIds: ["plugin.uppercase"],
    }));
    expect(report.candidates[0]).toEqual(expect.objectContaining({
      moduleId: "plugin.uppercase",
      decision: "eligible",
      matchedConditions: ["request.transform == uppercase"],
      reasons: [],
    }));
    expect(report.evaluation).toEqual(expect.objectContaining({
      deterministic: true,
      readOnly: true,
      noExecution: true,
      noNetwork: true,
      autoActivation: false,
      autoMutation: false,
      runtimeCompatibilityProof: false,
    }));
  });

  it("supports only exact scalar conditions and conservative numeric comparator ranges", () => {
    expect(evaluateRouterCondition("request.transform == uppercase", {
      "request.transform": "uppercase",
    }).status).toBe("matched");
    expect(evaluateRouterCondition("request.count != 2", {
      "request.count": 3,
    }).status).toBe("matched");
    expect(evaluateRouterCondition("request.transform ~= uppercase", {
      "request.transform": "uppercase",
    }).status).toBe("unsupported");

    expect(evaluateNumericVersionRange("0.1.0", ">=0.1 <0.2").status).toBe("satisfied");
    expect(evaluateNumericVersionRange("0.2.0", ">=0.1 <0.2").status).toBe("unsatisfied");
    expect(evaluateNumericVersionRange("0.1.0", "^0.1.0").status).toBe("unsupported");
  });

  it("reports independent blockers for activation, contracts, permissions, and risk", () => {
    const project = clonedProject();
    const module = uppercaseModule(project);
    module.manifest.requires.tools = ["tool.case-map"];
    module.manifest.requires.data = ["unicode.case-table"];
    module.manifest.riskLevel = "L2";

    const report = evaluateRouterContracts(project, {
      ...fixtureRequest(),
      facts: { "request.transform": "lowercase" },
      availableInputs: [],
      requiredOutputs: ["image"],
      availableTools: [],
      availableData: [],
      requestedPermissions: ["network", "write-output"],
      maxRiskLevel: "L0",
    });
    const codes = report.candidates[0]?.reasons.map((item) => item.code) ?? [];

    expect(report.summary.status).toBe("no-match");
    expect(report.candidates[0]?.decision).toBe("rejected");
    expect(codes).toEqual(expect.arrayContaining([
      "MSSP_ROUTE_002",
      "MSSP_ROUTE_004",
      "MSSP_ROUTE_005",
      "MSSP_ROUTE_007",
      "MSSP_ROUTE_008",
      "MSSP_ROUTE_009",
      "MSSP_ROUTE_010",
      "MSSP_ROUTE_011",
    ]));
  });

  it("refuses to choose silently when more than one TMS is eligible", () => {
    const project = clonedProject();
    addEligibleTms(project, "plugin.alternate-uppercase");
    const request = fixtureRequest();
    delete request.targetModules;

    const ambiguous = evaluateRouterContracts(project, request);
    expect(ambiguous.summary.status).toBe("ambiguous");
    expect(ambiguous.summary.selectedModuleIds).toEqual([]);
    expect(ambiguous.summary.eligibleModuleIds).toEqual([
      "plugin.alternate-uppercase",
      "plugin.uppercase",
    ]);

    const targeted = evaluateRouterContracts(project, {
      ...request,
      targetModules: ["plugin.uppercase"],
    });
    expect(targeted.summary.status).toBe("selected");
    expect(targeted.summary.selectedModuleIds).toEqual(["plugin.uppercase"]);
  });

  it("keeps unsupported activation and compatibility syntax indeterminate", () => {
    const project = clonedProject();
    const module = uppercaseModule(project);
    module.manifest.activateWhen = ["request.transform ~= uppercase"];
    module.manifest.compatibility.mssp = "^0.1.0";

    const report = evaluateRouterContracts(project, fixtureRequest());
    const candidate = report.candidates[0];

    expect(report.summary.status).toBe("indeterminate");
    expect(candidate?.decision).toBe("indeterminate");
    expect(candidate?.reasons.map((item) => item.code)).toEqual([
      "MSSP_ROUTE_003",
      "MSSP_ROUTE_014",
    ]);
  });

  it("rejects incompatible MSSP and required-module versions", () => {
    const project = clonedProject();
    const core = project.modules.find((item) => item.manifest.id === "core.echo");
    if (!core) throw new Error("Core fixture module is missing.");
    core.manifest.version = "0.2.0";

    const report = evaluateRouterContracts(project, {
      ...fixtureRequest(),
      msspVersion: "0.2.0",
    });
    const codes = report.candidates[0]?.reasons.map((item) => item.code) ?? [];

    expect(report.summary.status).toBe("no-match");
    expect(codes).toContain("MSSP_ROUTE_012");
    expect(codes).toContain("MSSP_ROUTE_013");
  });

  it("reports explicit targets that are not declared TMS modules", () => {
    const report = evaluateRouterContracts(clonedProject(), {
      ...fixtureRequest(),
      targetModules: ["core.echo"],
    });

    expect(report.summary.status).toBe("indeterminate");
    expect(report.summary.selectedModuleIds).toEqual([]);
    expect(report.findings).toContainEqual(expect.objectContaining({
      code: "MSSP_ROUTE_015",
      severity: "error",
    }));
  });

  it("is deterministic, normalizes set-like fields, and does not mutate inputs", () => {
    const project = clonedProject();
    const request: MsspRouterRequest = {
      ...fixtureRequest(),
      availableModules: ["core.echo"],
      requestedPermissions: ["read-input"],
      availableInputs: ["text"],
      requiredOutputs: ["text"],
    };
    const beforeProject = structuredClone(project);
    const beforeRequest = structuredClone(request);

    const first = evaluateRouterContracts(project, request);
    const second = evaluateRouterContracts(project, request);

    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(project).toEqual(beforeProject);
    expect(request).toEqual(beforeRequest);
    expect(() => parseRouterRequest({
      ...request,
      availableInputs: ["text", "text"],
    })).toThrow("Invalid MSSP Router Request");
  });
});
