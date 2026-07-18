import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { evaluateAdapterConformance } from "../src/adapter.js";
import {
  listAdapterDescriptors,
  resolveRegisteredAdapter,
} from "../src/adapter-registry.js";
import {
  AGENT_SKILL_ADAPTER_DESCRIPTOR,
  adaptAgentSkillMsspExport,
  parseAgentSkillMsspExport,
} from "../src/agent-skill-adapter.js";
import {
  validateAdapterConformanceSchema,
  validateAdapterDescriptorSchema,
  validateAgentSkillAdapterInputSchema,
  validateIntermediateModelSchema,
} from "../src/schema.js";

function fixture(): unknown {
  return JSON.parse(
    readFileSync(resolve("examples/agent-skill-adapter/semantic-export.json"), "utf8"),
  ) as unknown;
}

describe("Agent Skill Adapter v0.3", () => {
  it("publishes a schema-valid descriptor through the deterministic adapter registry", () => {
    expect(validateAdapterDescriptorSchema(AGENT_SKILL_ADAPTER_DESCRIPTOR)).toBe(true);
    expect(listAdapterDescriptors().map((descriptor) => descriptor.id)).toEqual([
      "agent-skill-mssp-export",
      "eml-mssp-export",
      "godot-mssp-export",
      "python-mssp-export",
      "rust-mssp-export",
    ]);
    expect(resolveRegisteredAdapter("agent-skill")?.descriptor.id).toBe("agent-skill-mssp-export");
    expect(resolveRegisteredAdapter("skill")?.descriptor.id).toBe("agent-skill-mssp-export");
    expect(AGENT_SKILL_ADAPTER_DESCRIPTOR.invariants).toEqual({
      deterministic: true,
      readOnly: true,
      noExecution: true,
      noNetwork: true,
      autoPromotion: false,
      autoMutation: false,
    });
  });

  it("adapts an Agent Skill semantic export into a conformant Intermediate Model", () => {
    const input = fixture();
    expect(validateAgentSkillAdapterInputSchema(input)).toBe(true);

    const model = adaptAgentSkillMsspExport(input, { revision: "fixture-revision" });
    const conformance = evaluateAdapterConformance(AGENT_SKILL_ADAPTER_DESCRIPTOR, model);

    expect(validateIntermediateModelSchema(model)).toBe(true);
    expect(validateAdapterConformanceSchema(conformance)).toBe(true);
    expect(conformance.ok).toBe(true);
    expect(model.generatedBy.adapter).toBe("agent-skill-mssp-export");
    expect(model.modules.map((module) => module.id)).toEqual([
      "core.planner",
      "skill.research",
    ]);
    expect(model.candidates.map((candidate) => candidate.id)).toEqual([
      "candidate.agent-skill.experimental.session-memory",
    ]);
    expect(model.relations.some((relation) =>
      relation.kind === "requires"
      && relation.from === "skill.research"
      && relation.to === "core.planner"
    )).toBe(true);
    expect(model.project.metadata).toMatchObject({
      agentSkillExecutionEnvironments: ["local", "sandbox"],
      agentSkillFramework: "portable-agent-skills",
      agentSkillFrameworkVersion: "1.0",
      agentSkillManifestFormat: "json",
      agentSkillManifestVersion: "1.0",
      agentSkillModelFamilies: ["language-model"],
      agentSkillProtocolVersion: "0.3",
      agentSkillTransports: ["stdio"],
    });
    expect(model.modules.find((module) => module.id === "skill.research")?.metadata).toMatchObject({
      agentSkillCapabilities: ["citation", "research"],
      agentSkillComponentKind: "skill",
      agentSkillDelegatesTo: ["core.planner"],
      agentSkillDeniedPermissions: ["write-source"],
      agentSkillIdentity: "skill:example.research@1",
      agentSkillNamespace: "example.optional",
      agentSkillRequiredPermissions: ["network", "read-project"],
      agentSkillToolNames: ["search.query", "source.fetch"],
      agentSkillTriggers: ["intent:research"],
    });
    expect(model.modules.every((module) => module.source.revision === "fixture-revision")).toBe(true);
  });

  it("keeps an undeclared memory policy unclassified even when it names permissions and resources", () => {
    const input = parseAgentSkillMsspExport(fixture());
    const memory = input.components.find((component) => component.id === "experimental.session-memory");
    expect(memory?.skillKind).toBe("memory-policy");
    expect(memory?.requiredPermissions).toContain("write-session-memory");
    expect(memory?.declaration).toBeUndefined();

    const model = adaptAgentSkillMsspExport(input);
    expect(model.modules.some((module) => module.id === "experimental.session-memory")).toBe(false);
    expect(model.candidates[0]?.status).toBe("unclassified");
    expect(model.candidates[0]?.evidence[0]?.data).toMatchObject({
      agentSkillIdentity: "memory-policy:example.session@experimental",
      agentSkillRequiredPermissions: ["read-session-memory", "write-session-memory"],
      autoPromotion: false,
      componentId: "experimental.session-memory",
      sourceKind: "memory-policy",
    });
  });

  it("does not turn tools, triggers, handoffs, permissions, or resources into normative relations", () => {
    const model = adaptAgentSkillMsspExport(fixture());
    expect(model.relations).toEqual([
      expect.objectContaining({ kind: "affects", from: "core.planner", to: "skill.research" }),
      expect.objectContaining({ kind: "affected-by", from: "skill.research", to: "core.planner" }),
      expect.objectContaining({ kind: "requires", from: "skill.research", to: "core.planner" }),
    ]);
    expect(model.relations.every((relation) =>
      ["requires", "affects", "affected-by"].includes(relation.kind)
    )).toBe(true);
  });

  it("does not mutate the Agent Skill export while adapting it", () => {
    const input = fixture();
    const before = JSON.stringify(input);
    adaptAgentSkillMsspExport(input);
    expect(JSON.stringify(input)).toBe(before);
  });

  it("is deterministic for identical input and options", () => {
    const input = fixture();
    const first = JSON.stringify(adaptAgentSkillMsspExport(input, { revision: "same" }));
    const second = JSON.stringify(adaptAgentSkillMsspExport(input, { revision: "same" }));
    expect(second).toBe(first);
  });

  it("rejects incomplete declarations instead of filling architecture fields", () => {
    const input = fixture() as {
      components: Array<Record<string, unknown>>;
    };
    const first = input.components[0];
    if (!first) throw new Error("fixture component missing");
    first.declaration = {
      version: "1.0.0",
      layer: "SMS",
      purpose: "Incomplete declaration",
    };

    expect(() => adaptAgentSkillMsspExport(input)).toThrow(/Invalid Agent Skill MSSP export/);
  });

  it("rejects duplicate component and Agent Skill identities", () => {
    const duplicateId = fixture() as {
      components: Array<Record<string, unknown>>;
    };
    const first = duplicateId.components[0];
    if (!first) throw new Error("fixture component missing");
    duplicateId.components.push(structuredClone(first));
    expect(() => adaptAgentSkillMsspExport(duplicateId)).toThrow(/Agent Skill components contains duplicate identities/);

    const duplicateSkillIdentity = fixture() as {
      components: Array<Record<string, unknown>>;
    };
    const firstSkillIdentity = duplicateSkillIdentity.components[0]?.skillIdentity;
    if (typeof firstSkillIdentity !== "string") throw new Error("fixture Agent Skill identity missing");
    const second = duplicateSkillIdentity.components[1];
    if (!second) throw new Error("fixture second component missing");
    second.skillIdentity = firstSkillIdentity;
    expect(() => adaptAgentSkillMsspExport(duplicateSkillIdentity)).toThrow(/Agent Skill identities contains duplicate identities/);
  });

  it("rejects absolute source paths instead of leaking environment-local provenance", () => {
    const input = fixture() as {
      project: Record<string, unknown>;
    };
    input.project.sourceUri = "/tmp/private/agent-skills.json";
    expect(() => adaptAgentSkillMsspExport(input)).toThrow(/must be repository-relative or a portable logical URI/);
  });
});
