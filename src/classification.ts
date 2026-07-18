import type {
  IntermediateCandidate,
  ModelEvidence,
} from "./model.js";
import type {
  RepositoryStaticDependency,
  RepositoryWorkspace,
} from "./repository-evidence.js";
import {
  MSSP_LAYERS,
} from "./types.js";
import type { MsspLayer } from "./types.js";

export type RepositorySuggestedLayer = MsspLayer | "UNDETERMINED";
export type RepositoryClassificationConfidence = "low" | "medium" | "high";

export interface RepositoryClassificationAlternative {
  layer: MsspLayer;
  supportScore: number;
}

export interface RepositoryClassificationSuggestion {
  candidateId: string;
  candidatePath: string;
  status: "review-required";
  suggestedLayer: RepositorySuggestedLayer;
  confidence: RepositoryClassificationConfidence;
  supportScore: number;
  alternativeLayers: RepositoryClassificationAlternative[];
  supportingEvidence: ModelEvidence[];
  counterEvidence: ModelEvidence[];
  unresolvedQuestions: string[];
}

export interface RepositoryClassificationAnalysis {
  method: {
    id: "mssp-static-layer-heuristics";
    version: "0.2";
    mode: "advisory";
    autoPromotion: false;
  };
  suggestions: RepositoryClassificationSuggestion[];
}

interface MutableLayerScore {
  layer: MsspLayer;
  score: number;
  evidence: ModelEvidence[];
}

interface CandidateTopology {
  incomingCandidates: string[];
  outgoingCandidates: string[];
  externalTargets: string[];
  unresolvedTargets: string[];
}

const ROLE_TOKENS: Record<MsspLayer, readonly string[]> = {
  FMS: [
    "fms",
    "identity",
    "manifest",
    "metadata",
    "architecture",
    "constitution",
    "narrative",
  ],
  SCL: [
    "scl",
    "policy",
    "policies",
    "permission",
    "permissions",
    "governance",
    "approval",
    "approvals",
    "guard",
    "guards",
  ],
  SMS: [
    "sms",
    "core",
    "kernel",
    "domain",
    "foundation",
    "foundations",
    "protocol",
    "protocols",
    "schema",
    "schemas",
    "model",
    "models",
  ],
  TMS: [
    "tms",
    "plugin",
    "plugins",
    "addon",
    "addons",
    "extension",
    "extensions",
    "adapter",
    "adapters",
    "integration",
    "integrations",
    "exporter",
    "exporters",
    "importer",
    "importers",
    "feature",
    "features",
    "optional",
  ],
  DMS: [
    "dms",
    "diagnostic",
    "diagnostics",
    "observability",
    "telemetry",
    "trace",
    "tracing",
    "logging",
    "logs",
    "metrics",
    "monitor",
    "monitoring",
  ],
  ROUTER: [
    "router",
    "routing",
    "dispatch",
    "dispatcher",
    "selector",
    "registry",
    "orchestrator",
    "orchestration",
    "planner",
  ],
  RUNTIME: [
    "runtime",
    "executor",
    "execution",
    "engine",
    "runner",
    "scheduler",
    "worker",
  ],
};

const LAYER_ORDER = new Map<MsspLayer, number>(
  MSSP_LAYERS.map((layer, index) => [layer, index]),
);

function roundScore(value: number): number {
  return Math.round(Math.min(1, Math.max(0, value / 6)) * 100) / 100;
}

function candidateTokens(candidate: IntermediateCandidate): Set<string> {
  return new Set(
    `${candidate.path}/${candidate.name}`
      .normalize("NFKD")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean),
  );
}

function evidenceKey(evidence: ModelEvidence): string {
  return `${evidence.kind}\u0000${evidence.message}\u0000${evidence.source?.uri ?? ""}`;
}

function uniqueEvidence(values: readonly ModelEvidence[]): ModelEvidence[] {
  const seen = new Set<string>();
  return values
    .filter((evidence) => {
      const key = evidenceKey(evidence);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => evidenceKey(a).localeCompare(evidenceKey(b)));
}

function topologyFor(
  candidate: IntermediateCandidate,
  dependencies: readonly RepositoryStaticDependency[],
): CandidateTopology {
  const incomingCandidates = new Set<string>();
  const outgoingCandidates = new Set<string>();
  const externalTargets = new Set<string>();
  const unresolvedTargets = new Set<string>();

  for (const dependency of dependencies) {
    if (dependency.to === candidate.id && dependency.targetKind === "candidate") {
      incomingCandidates.add(dependency.from);
    }
    if (dependency.from !== candidate.id) continue;
    if (dependency.targetKind === "candidate" && dependency.to !== candidate.id) {
      outgoingCandidates.add(dependency.to);
    } else if (dependency.scope === "external") {
      externalTargets.add(dependency.to);
    } else if (dependency.scope === "unresolved") {
      unresolvedTargets.add(dependency.to);
    }
  }

  return {
    incomingCandidates: [...incomingCandidates].sort((a, b) => a.localeCompare(b)),
    outgoingCandidates: [...outgoingCandidates].sort((a, b) => a.localeCompare(b)),
    externalTargets: [...externalTargets].sort((a, b) => a.localeCompare(b)),
    unresolvedTargets: [...unresolvedTargets].sort((a, b) => a.localeCompare(b)),
  };
}

function questionsFor(layer: RepositorySuggestedLayer): string[] {
  if (layer === "SMS" || layer === "TMS") {
    return [
      "Can a coherent system version operate without this candidate?",
      "Is activation unconditional, or selected by request, context, policy, or environment?",
      "Which stable contracts are allowed to depend on this candidate?",
      "Can the candidate fail, be removed, or be replaced without invalidating the system identity?",
    ];
  }
  if (layer === "FMS") {
    return [
      "Does the candidate define system identity and constitutional metadata rather than operational capability?",
      "Does the candidate contain executable behavior that would violate FMS purity?",
    ];
  }
  if (layer === "SCL") {
    return [
      "Does the candidate enforce change, permission, approval, or activation policy?",
      "Is the policy authoritative, or merely a helper used by another governing component?",
    ];
  }
  if (layer === "DMS") {
    return [
      "Does the candidate only observe, diagnose, trace, or explain execution?",
      "Does it own business state or make business decisions that would place it outside DMS?",
    ];
  }
  if (layer === "ROUTER") {
    return [
      "Does the candidate select capabilities by declared contracts without performing their work?",
      "Are routing rules policy-governed and independently observable?",
    ];
  }
  if (layer === "RUNTIME") {
    return [
      "Does the candidate execute declared plans and reject undeclared modules?",
      "Does it emit observable execution evidence and preserve rollback or safe-failure boundaries?",
    ];
  }
  return [
    "What capability does this candidate own at the system level?",
    "Can a coherent system version operate without it?",
    "Is activation unconditional or context-dependent?",
    "Does it own business state, policy, routing, execution, or observation?",
  ];
}

function addSignal(
  scores: Map<MsspLayer, MutableLayerScore>,
  candidate: IntermediateCandidate,
  layer: MsspLayer,
  weight: number,
  ruleId: string,
  message: string,
  data: Record<string, unknown> = {},
): void {
  const current = scores.get(layer);
  if (!current) return;
  current.score += weight;
  current.evidence.push({
    kind: "inference",
    message,
    source: candidate.source,
    data: {
      ruleId,
      layer,
      weight,
      ...data,
    },
  });
}

function scoreCandidate(
  candidate: IntermediateCandidate,
  dependencies: readonly RepositoryStaticDependency[],
  workspaces: readonly RepositoryWorkspace[],
): {
  scores: MutableLayerScore[];
  topology: CandidateTopology;
  workspaceMember: boolean;
} {
  const scores = new Map<MsspLayer, MutableLayerScore>(
    MSSP_LAYERS.map((layer) => [layer, { layer, score: 0, evidence: [] }]),
  );
  const tokens = candidateTokens(candidate);

  for (const layer of MSSP_LAYERS) {
    const hits = ROLE_TOKENS[layer].filter((token) => tokens.has(token));
    if (!hits.length) continue;
    const weight = Math.min(4, 3 + ((hits.length - 1) * 0.5));
    addSignal(
      scores,
      candidate,
      layer,
      weight,
      "role-token",
      `${candidate.path} contains terminology associated with ${layer}.`,
      { tokens: hits },
    );
  }

  const workspaceMember = workspaces.some((workspace) => workspace.members.includes(candidate.path));
  if (workspaceMember) {
    addSignal(
      scores,
      candidate,
      "TMS",
      0.5,
      "workspace-modularity",
      `${candidate.path} is an independently declared workspace member.`,
      { boundaryKind: candidate.boundaryKind },
    );
  }
  if (candidate.boundaryKind === "package") {
    addSignal(
      scores,
      candidate,
      "TMS",
      0.25,
      "package-boundary",
      `${candidate.path} is an independently packaged structural boundary.`,
      { boundaryKind: candidate.boundaryKind },
    );
  }

  const topology = topologyFor(candidate, dependencies);
  if (topology.incomingCandidates.length >= 2) {
    addSignal(
      scores,
      candidate,
      "SMS",
      1.5,
      "shared-inbound-dependency",
      `${candidate.path} is referenced by multiple candidate boundaries.`,
      { incomingCandidates: topology.incomingCandidates },
    );
  } else if (topology.incomingCandidates.length === 1) {
    addSignal(
      scores,
      candidate,
      "SMS",
      0.5,
      "single-inbound-dependency",
      `${candidate.path} is referenced by another candidate boundary.`,
      { incomingCandidates: topology.incomingCandidates },
    );
  }

  if (topology.incomingCandidates.length >= 1 && topology.outgoingCandidates.length === 0) {
    addSignal(
      scores,
      candidate,
      "SMS",
      0.5,
      "dependency-leaf",
      `${candidate.path} is consumed by other candidates without a detected outgoing candidate dependency.`,
      { incomingCandidates: topology.incomingCandidates },
    );
  }

  if (topology.outgoingCandidates.length >= 1) {
    addSignal(
      scores,
      candidate,
      "TMS",
      0.5,
      "declared-outward-modularity",
      `${candidate.path} references another candidate boundary.`,
      { outgoingCandidates: topology.outgoingCandidates },
    );
  }

  if (
    candidate.boundaryKind === "package"
    && topology.incomingCandidates.length === 0
    && topology.externalTargets.length >= 1
  ) {
    addSignal(
      scores,
      candidate,
      "TMS",
      0.25,
      "isolated-external-capability",
      `${candidate.path} is independently packaged, has external dependencies, and has no detected candidate consumer.`,
      { externalTargets: topology.externalTargets },
    );
  }

  return {
    scores: [...scores.values()].sort((a, b) => {
      const scoreDifference = b.score - a.score;
      if (scoreDifference !== 0) return scoreDifference;
      return (LAYER_ORDER.get(a.layer) ?? 0) - (LAYER_ORDER.get(b.layer) ?? 0);
    }),
    topology,
    workspaceMember,
  };
}

function aggregateBoundarySuggestion(
  candidate: IntermediateCandidate,
  truncated: boolean,
): RepositoryClassificationSuggestion {
  const counterEvidence: ModelEvidence[] = [];
  if (truncated) {
    counterEvidence.push({
      kind: "inference",
      message: "The repository scan is truncated, so classification evidence is incomplete.",
      source: candidate.source,
      data: { ruleId: "truncated-scan" },
    });
  }
  return {
    candidateId: candidate.id,
    candidatePath: candidate.path,
    status: "review-required",
    suggestedLayer: "UNDETERMINED",
    confidence: "low",
    supportScore: 0,
    alternativeLayers: [],
    supportingEvidence: [{
      kind: "inference",
      message: `${candidate.path} is an aggregate ${candidate.boundaryKind} boundary and is not treated as a module-level layer candidate.`,
      source: candidate.source,
      data: {
        ruleId: "aggregate-boundary-exclusion",
        boundaryKind: candidate.boundaryKind,
      },
    }],
    counterEvidence,
    unresolvedQuestions: questionsFor("UNDETERMINED"),
  };
}

function classifyCandidate(
  candidate: IntermediateCandidate,
  dependencies: readonly RepositoryStaticDependency[],
  workspaces: readonly RepositoryWorkspace[],
  truncated: boolean,
): RepositoryClassificationSuggestion {
  if (candidate.boundaryKind === "repository" || candidate.boundaryKind === "source-root") {
    return aggregateBoundarySuggestion(candidate, truncated);
  }

  const { scores, topology, workspaceMember } = scoreCandidate(candidate, dependencies, workspaces);
  const top = scores[0];
  const second = scores[1];
  if (!top || !second) return aggregateBoundarySuggestion(candidate, truncated);

  const margin = top.score - second.score;
  const decisive = top.score >= 2.5 && margin >= 1;
  const suggestedLayer: RepositorySuggestedLayer = decisive ? top.layer : "UNDETERMINED";

  let confidence: RepositoryClassificationConfidence = "low";
  if (decisive && !truncated) {
    confidence = top.score >= 4.5 && margin >= 2.5 && topology.unresolvedTargets.length === 0
      ? "high"
      : "medium";
  }

  const alternatives = scores
    .filter((score) => score.score > 0 && (!decisive || score.layer !== top.layer))
    .slice(0, 3)
    .map((score) => ({
      layer: score.layer,
      supportScore: roundScore(score.score),
    }));

  const counterEvidence: ModelEvidence[] = [];
  const competingScores = scores.filter((score) => score.score > 0 && score.layer !== top.layer);
  for (const competing of competingScores.slice(0, 2)) {
    counterEvidence.push(...competing.evidence.map((evidence): ModelEvidence => ({
      ...evidence,
      data: {
        ...evidence.data,
        competingLayer: competing.layer,
      },
    })));
  }

  if (suggestedLayer === "SMS" && workspaceMember) {
    counterEvidence.push({
      kind: "inference",
      message: `${candidate.path} is independently packaged, which leaves replaceability and optionality unresolved.`,
      source: candidate.source,
      data: { ruleId: "workspace-counter-sms" },
    });
  }
  if (suggestedLayer === "TMS" && topology.incomingCandidates.length >= 2) {
    counterEvidence.push({
      kind: "inference",
      message: `${candidate.path} has multiple detected candidate consumers, which may indicate a stable shared capability.`,
      source: candidate.source,
      data: {
        ruleId: "shared-consumer-counter-tms",
        incomingCandidates: topology.incomingCandidates,
      },
    });
  }
  if (topology.unresolvedTargets.length > 0) {
    counterEvidence.push({
      kind: "inference",
      message: `${candidate.path} has unresolved local-looking dependencies, so its topology is incomplete.`,
      source: candidate.source,
      data: {
        ruleId: "unresolved-topology",
        unresolvedTargets: topology.unresolvedTargets,
      },
    });
  }
  if (truncated) {
    counterEvidence.push({
      kind: "inference",
      message: "The repository scan is truncated, so classification evidence is incomplete.",
      source: candidate.source,
      data: { ruleId: "truncated-scan" },
    });
  }

  return {
    candidateId: candidate.id,
    candidatePath: candidate.path,
    status: "review-required",
    suggestedLayer,
    confidence,
    supportScore: roundScore(top.score),
    alternativeLayers: alternatives,
    supportingEvidence: uniqueEvidence(
      decisive
        ? top.evidence
        : [{
          kind: "inference",
          message: `${candidate.path} does not have a sufficiently dominant static signal for an MSSP layer suggestion.`,
          source: candidate.source,
          data: {
            ruleId: "insufficient-dominance",
            strongestLayer: top.layer,
            strongestRawScore: top.score,
            margin,
          },
        }],
    ),
    counterEvidence: uniqueEvidence(counterEvidence),
    unresolvedQuestions: questionsFor(suggestedLayer),
  };
}

export function classifyRepositoryCandidates(
  candidates: readonly IntermediateCandidate[],
  dependencies: readonly RepositoryStaticDependency[],
  workspaces: readonly RepositoryWorkspace[],
  truncated: boolean,
): RepositoryClassificationAnalysis {
  return {
    method: {
      id: "mssp-static-layer-heuristics",
      version: "0.2",
      mode: "advisory",
      autoPromotion: false,
    },
    suggestions: candidates
      .map((candidate) => classifyCandidate(
        candidate,
        dependencies,
        workspaces,
        truncated,
      ))
      .sort((a, b) => a.candidateId.localeCompare(b.candidateId)),
  };
}
