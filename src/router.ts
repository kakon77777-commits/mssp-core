import { formatSchemaErrors, validateRouterRequestSchema } from "./schema.js";
import type { LoadedModule, LoadedProject, RiskLevel } from "./types.js";

export const MSSP_ROUTER_REQUEST_VERSION = "0.4" as const;
export const MSSP_ROUTER_REQUEST_KIND = "mssp-router-request" as const;
export const MSSP_ROUTER_EVALUATION_KIND = "mssp-router-evaluation-report" as const;

export type RouterFactValue = string | number | boolean | null;
export type RouterCandidateDecision = "eligible" | "rejected" | "indeterminate";
export type RouterEvaluationStatus = "selected" | "ambiguous" | "no-match" | "indeterminate";
export type RouterReasonStatus = "rejected" | "indeterminate";
export type RouterReasonCategory =
  | "target"
  | "activation"
  | "input"
  | "output"
  | "dependency"
  | "tool"
  | "data"
  | "permission"
  | "risk"
  | "compatibility";

export interface MsspRouterRequest {
  schemaVersion: typeof MSSP_ROUTER_REQUEST_VERSION;
  kind: typeof MSSP_ROUTER_REQUEST_KIND;
  requestId: string;
  intent: string;
  facts: Record<string, RouterFactValue>;
  msspVersion: string;
  availableInputs: string[];
  requiredOutputs: string[];
  availableModules: string[];
  availableTools: string[];
  availableData: string[];
  requestedPermissions: string[];
  maxRiskLevel: RiskLevel;
  targetModules?: string[];
}

export interface RouterDecisionReason {
  code: string;
  category: RouterReasonCategory;
  status: RouterReasonStatus;
  message: string;
  data: Record<string, unknown>;
}

export interface RouterCandidateEvaluation {
  moduleId: string;
  name: string;
  version: string;
  riskLevel: RiskLevel;
  decision: RouterCandidateDecision;
  matchedConditions: string[];
  reasons: RouterDecisionReason[];
}

export interface RouterEvaluationFinding {
  code: string;
  severity: "error" | "warning";
  message: string;
  data: Record<string, unknown>;
}

export interface MsspRouterEvaluationReport {
  schemaVersion: typeof MSSP_ROUTER_REQUEST_VERSION;
  kind: typeof MSSP_ROUTER_EVALUATION_KIND;
  generatedBy: {
    name: string;
    version: string;
    evaluator: "router-contract-evaluator";
  };
  sourceModel: {
    projectId: string;
    projectName: string;
    projectVersion: string;
    revision?: string;
  };
  request: MsspRouterRequest;
  evaluation: {
    mode: "static-contract";
    conditionLanguage: "mssp-exact-condition-v0.4";
    compatibilityLanguage: "numeric-comparator-range-v0.4";
    deterministic: true;
    readOnly: true;
    noExecution: true;
    noNetwork: true;
    autoActivation: false;
    autoMutation: false;
    runtimeCompatibilityProof: false;
  };
  candidates: RouterCandidateEvaluation[];
  findings: RouterEvaluationFinding[];
  summary: {
    status: RouterEvaluationStatus;
    ok: boolean;
    totalCandidates: number;
    eligible: number;
    rejected: number;
    indeterminate: number;
    selectedModuleIds: string[];
    eligibleModuleIds: string[];
  };
}

export interface RouterEvaluationOptions {
  revision?: string;
  implementationName?: string;
  implementationVersion?: string;
}

export interface RouterRangeEvaluation {
  status: "satisfied" | "unsatisfied" | "unsupported";
  detail: string;
}

export interface RouterConditionEvaluation {
  status: "matched" | "unmatched" | "unsupported";
  fact?: string;
  expected?: RouterFactValue;
  actual?: RouterFactValue;
  detail: string;
}

const RISK_RANK: Record<RiskLevel, number> = { L0: 0, L1: 1, L2: 2, L3: 3, L4: 4 };
const compareText = (a: string, b: string): number => a.localeCompare(b);
const uniqueSorted = (values: Iterable<string>): string[] => [...new Set(values)].sort(compareText);

function normalizeRequest(request: MsspRouterRequest): MsspRouterRequest {
  const normalized: MsspRouterRequest = {
    ...request,
    facts: Object.fromEntries(Object.entries(request.facts).sort(([a], [b]) => compareText(a, b))),
    availableInputs: uniqueSorted(request.availableInputs),
    requiredOutputs: uniqueSorted(request.requiredOutputs),
    availableModules: uniqueSorted(request.availableModules),
    availableTools: uniqueSorted(request.availableTools),
    availableData: uniqueSorted(request.availableData),
    requestedPermissions: uniqueSorted(request.requestedPermissions),
  };
  if (request.targetModules) normalized.targetModules = uniqueSorted(request.targetModules);
  return normalized;
}

export function parseRouterRequest(value: unknown): MsspRouterRequest {
  if (!validateRouterRequestSchema(value)) {
    throw new Error(
      `Invalid MSSP Router Request:\n${formatSchemaErrors(validateRouterRequestSchema.errors).join("\n")}`,
    );
  }
  return normalizeRequest(value as MsspRouterRequest);
}

interface NumericVersion { major: number; minor: number; patch: number }

function parseVersion(value: string): NumericVersion | undefined {
  const match = /^(\d+)(?:\.(\d+))?(?:\.(\d+))?$/u.exec(value.trim());
  if (!match) return undefined;
  return {
    major: Number(match[1]),
    minor: Number(match[2] ?? 0),
    patch: Number(match[3] ?? 0),
  };
}

function compareVersion(a: NumericVersion, b: NumericVersion): number {
  return a.major !== b.major ? a.major - b.major
    : a.minor !== b.minor ? a.minor - b.minor
    : a.patch - b.patch;
}

export function evaluateNumericVersionRange(versionValue: string, rangeValue: string): RouterRangeEvaluation {
  const version = parseVersion(versionValue);
  if (!version) return { status: "unsupported", detail: `Unsupported version '${versionValue}'.` };
  const tokens = rangeValue.trim().split(/\s+/u).filter(Boolean);
  if (!tokens.length) return { status: "unsupported", detail: "Compatibility range is empty." };

  for (const token of tokens) {
    if (token === "*") continue;
    const match = /^(>=|<=|>|<|=)?(\d+(?:\.\d+){0,2})$/u.exec(token);
    if (!match) return { status: "unsupported", detail: `Unsupported comparator '${token}'.` };
    const expected = parseVersion(match[2] ?? "");
    if (!expected) return { status: "unsupported", detail: `Unsupported comparator '${token}'.` };
    const compared = compareVersion(version, expected);
    const operator = match[1] ?? "=";
    const satisfied = operator === ">=" ? compared >= 0
      : operator === "<=" ? compared <= 0
      : operator === ">" ? compared > 0
      : operator === "<" ? compared < 0
      : compared === 0;
    if (!satisfied) return { status: "unsatisfied", detail: token };
  }
  return { status: "satisfied", detail: rangeValue };
}

function parseLiteral(value: string): { supported: true; value: RouterFactValue } | { supported: false } {
  const trimmed = value.trim();
  if (!trimmed) return { supported: false };
  if (trimmed.startsWith('"')) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      return typeof parsed === "string" ? { supported: true, value: parsed } : { supported: false };
    } catch {
      return { supported: false };
    }
  }
  if (trimmed === "true") return { supported: true, value: true };
  if (trimmed === "false") return { supported: true, value: false };
  if (trimmed === "null") return { supported: true, value: null };
  if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/u.test(trimmed)) return { supported: true, value: Number(trimmed) };
  return /^[A-Za-z0-9_.:/-]+$/u.test(trimmed)
    ? { supported: true, value: trimmed }
    : { supported: false };
}

export function evaluateRouterCondition(
  condition: string,
  facts: Record<string, RouterFactValue>,
): RouterConditionEvaluation {
  const match = /^\s*([A-Za-z0-9_.-]+)\s*(==|!=)\s*(.*?)\s*$/u.exec(condition);
  if (!match) {
    return {
      status: "unsupported",
      detail: "Only '<fact> == <literal>' and '<fact> != <literal>' are supported.",
    };
  }
  const fact = match[1] ?? "";
  const operator = match[2] ?? "";
  const literal = parseLiteral(match[3] ?? "");
  if (!literal.supported) {
    return { status: "unsupported", fact, detail: "Condition literal is unsupported or malformed." };
  }
  if (!Object.prototype.hasOwnProperty.call(facts, fact)) {
    return { status: "unmatched", fact, expected: literal.value, detail: `Fact '${fact}' is absent.` };
  }
  const actual = facts[fact] as RouterFactValue;
  const matched = operator === "==" ? actual === literal.value : actual !== literal.value;
  return {
    status: matched ? "matched" : "unmatched",
    fact,
    expected: literal.value,
    actual,
    detail: `${fact} ${operator} ${String(literal.value)}`,
  };
}

function reason(
  code: string,
  category: RouterReasonCategory,
  status: RouterReasonStatus,
  message: string,
  data: Record<string, unknown> = {},
): RouterDecisionReason {
  return { code, category, status, message, data };
}

function missing(required: readonly string[], available: readonly string[]): string[] {
  const availableSet = new Set(available);
  return uniqueSorted(required.filter((value) => !availableSet.has(value)));
}

function conditionReason(condition: string, result: RouterConditionEvaluation): RouterDecisionReason {
  const data: Record<string, unknown> = { condition, detail: result.detail };
  if (result.fact !== undefined) data.fact = result.fact;
  if (result.expected !== undefined) data.expected = result.expected;
  if (result.actual !== undefined) data.actual = result.actual;
  return result.status === "unsupported"
    ? reason(
      "MSSP_ROUTE_003",
      "activation",
      "indeterminate",
      `Activation condition '${condition}' cannot be evaluated conservatively.`,
      data,
    )
    : reason(
      "MSSP_ROUTE_002",
      "activation",
      "rejected",
      `Activation condition '${condition}' is not satisfied.`,
      data,
    );
}

function evaluateCandidate(
  module: LoadedModule,
  project: LoadedProject,
  request: MsspRouterRequest,
): RouterCandidateEvaluation {
  const manifest = module.manifest;
  const reasons: RouterDecisionReason[] = [];
  const matchedConditions: string[] = [];

  if (request.targetModules && !request.targetModules.includes(manifest.id)) {
    reasons.push(reason("MSSP_ROUTE_001", "target", "rejected", "Module is outside the explicit target set.", {
      targetModules: request.targetModules,
    }));
  }

  for (const condition of manifest.activateWhen ?? []) {
    const result = evaluateRouterCondition(condition, request.facts);
    if (result.status === "matched") matchedConditions.push(condition);
    else reasons.push(conditionReason(condition, result));
  }

  const missingInputs = missing(manifest.inputs, request.availableInputs);
  if (missingInputs.length) reasons.push(reason("MSSP_ROUTE_004", "input", "rejected", "Required module inputs are unavailable.", { missingInputs }));
  const missingOutputs = missing(request.requiredOutputs, manifest.outputs);
  if (missingOutputs.length) reasons.push(reason("MSSP_ROUTE_005", "output", "rejected", "Module does not declare every required output.", { missingOutputs }));

  const projectModules = new Map(project.modules.map((item) => [item.manifest.id, item]));
  const unknownModules = manifest.requires.modules.filter((id) => !projectModules.has(id));
  const unavailableModules = manifest.requires.modules.filter((id) => projectModules.has(id) && !request.availableModules.includes(id));
  if (unknownModules.length || unavailableModules.length) {
    reasons.push(reason("MSSP_ROUTE_006", "dependency", "rejected", "Required module dependencies are missing or unavailable.", {
      unknownModules: uniqueSorted(unknownModules),
      unavailableModules: uniqueSorted(unavailableModules),
    }));
  }

  const missingTools = missing(manifest.requires.tools, request.availableTools);
  if (missingTools.length) reasons.push(reason("MSSP_ROUTE_007", "tool", "rejected", "Required tools are unavailable.", { missingTools }));
  const missingData = missing(manifest.requires.data, request.availableData);
  if (missingData.length) reasons.push(reason("MSSP_ROUTE_008", "data", "rejected", "Required data contracts are unavailable.", { missingData }));

  const explicitlyDenied = request.requestedPermissions.filter((permission) => manifest.permissions.mayNot.includes(permission));
  if (explicitlyDenied.length) reasons.push(reason("MSSP_ROUTE_010", "permission", "rejected", "The request includes operations explicitly denied by the module contract.", {
    explicitlyDenied: uniqueSorted(explicitlyDenied),
  }));
  const denied = new Set(explicitlyDenied);
  const notPermitted = request.requestedPermissions.filter((permission) => !denied.has(permission) && !manifest.permissions.may.includes(permission));
  if (notPermitted.length) reasons.push(reason("MSSP_ROUTE_009", "permission", "rejected", "The request includes operations not permitted by the module contract.", {
    notPermitted: uniqueSorted(notPermitted),
  }));

  if (RISK_RANK[manifest.riskLevel] > RISK_RANK[request.maxRiskLevel]) {
    reasons.push(reason("MSSP_ROUTE_011", "risk", "rejected", "Module risk exceeds the request ceiling.", {
      moduleRisk: manifest.riskLevel,
      maxRiskLevel: request.maxRiskLevel,
    }));
  }

  const msspCompatibility = evaluateNumericVersionRange(request.msspVersion, manifest.compatibility.mssp);
  if (msspCompatibility.status === "unsatisfied") {
    reasons.push(reason("MSSP_ROUTE_012", "compatibility", "rejected", "The requested MSSP version does not satisfy the module compatibility range.", {
      msspVersion: request.msspVersion,
      range: manifest.compatibility.mssp,
    }));
  } else if (msspCompatibility.status === "unsupported") {
    reasons.push(reason("MSSP_ROUTE_014", "compatibility", "indeterminate", "The MSSP compatibility range cannot be evaluated conservatively.", {
      msspVersion: request.msspVersion,
      range: manifest.compatibility.mssp,
      detail: msspCompatibility.detail,
    }));
  }

  for (const dependencyId of uniqueSorted(manifest.requires.modules)) {
    const range = manifest.compatibility.modules?.[dependencyId];
    const dependency = projectModules.get(dependencyId);
    if (!range || !dependency) continue;
    const compatibility = evaluateNumericVersionRange(dependency.manifest.version, range);
    if (compatibility.status === "unsatisfied") {
      reasons.push(reason("MSSP_ROUTE_013", "compatibility", "rejected", `Dependency '${dependencyId}' does not satisfy the declared compatibility range.`, {
        dependencyId,
        version: dependency.manifest.version,
        range,
      }));
    } else if (compatibility.status === "unsupported") {
      reasons.push(reason("MSSP_ROUTE_014", "compatibility", "indeterminate", `Compatibility for dependency '${dependencyId}' cannot be evaluated conservatively.`, {
        dependencyId,
        version: dependency.manifest.version,
        range,
        detail: compatibility.detail,
      }));
    }
  }

  reasons.sort((a, b) => `${a.code}\u0000${a.message}`.localeCompare(`${b.code}\u0000${b.message}`));
  const decision: RouterCandidateDecision = reasons.some((item) => item.status === "rejected")
    ? "rejected"
    : reasons.some((item) => item.status === "indeterminate")
      ? "indeterminate"
      : "eligible";
  return {
    moduleId: manifest.id,
    name: manifest.name,
    version: manifest.version,
    riskLevel: manifest.riskLevel,
    decision,
    matchedConditions: uniqueSorted(matchedConditions),
    reasons,
  };
}

export function evaluateRouterContracts(
  project: LoadedProject,
  requestValue: MsspRouterRequest | unknown,
  options: RouterEvaluationOptions = {},
): MsspRouterEvaluationReport {
  const request = parseRouterRequest(requestValue);
  const tmsModules = project.modules
    .filter((module) => module.manifest.layer === "TMS")
    .sort((a, b) => compareText(a.manifest.id, b.manifest.id));
  const tmsIds = new Set(tmsModules.map((module) => module.manifest.id));
  const findings: RouterEvaluationFinding[] = (request.targetModules ?? [])
    .filter((target) => !tmsIds.has(target))
    .map((target) => ({
      code: "MSSP_ROUTE_015",
      severity: "error",
      message: `Target module '${target}' is not a declared TMS module.`,
      data: { target },
    }));

  const candidates = tmsModules.map((module) => evaluateCandidate(module, project, request));
  const eligibleModuleIds = candidates.filter((item) => item.decision === "eligible").map((item) => item.moduleId);
  const rejected = candidates.filter((item) => item.decision === "rejected").length;
  const indeterminate = candidates.filter((item) => item.decision === "indeterminate").length;
  const status: RouterEvaluationStatus = eligibleModuleIds.length > 1
    ? "ambiguous"
    : eligibleModuleIds.length === 1 && indeterminate === 0 && findings.length === 0
      ? "selected"
      : eligibleModuleIds.length === 0 && indeterminate === 0 && findings.length === 0
        ? "no-match"
        : "indeterminate";

  const sourceModel: MsspRouterEvaluationReport["sourceModel"] = {
    projectId: project.manifest.id,
    projectName: project.manifest.name,
    projectVersion: project.manifest.version,
  };
  if (options.revision) sourceModel.revision = options.revision;

  return {
    schemaVersion: MSSP_ROUTER_REQUEST_VERSION,
    kind: MSSP_ROUTER_EVALUATION_KIND,
    generatedBy: {
      name: options.implementationName ?? "@evemisslab/mssp-core",
      version: options.implementationVersion ?? "0.1.0",
      evaluator: "router-contract-evaluator",
    },
    sourceModel,
    request,
    evaluation: {
      mode: "static-contract",
      conditionLanguage: "mssp-exact-condition-v0.4",
      compatibilityLanguage: "numeric-comparator-range-v0.4",
      deterministic: true,
      readOnly: true,
      noExecution: true,
      noNetwork: true,
      autoActivation: false,
      autoMutation: false,
      runtimeCompatibilityProof: false,
    },
    candidates,
    findings,
    summary: {
      status,
      ok: status === "selected",
      totalCandidates: candidates.length,
      eligible: eligibleModuleIds.length,
      rejected,
      indeterminate,
      selectedModuleIds: status === "selected" ? [...eligibleModuleIds] : [],
      eligibleModuleIds,
    },
  };
}
