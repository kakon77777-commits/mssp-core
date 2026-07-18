import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { evaluateAdapterConformance } from "../src/adapter.js";
import {
  listAdapterDescriptors,
  resolveRegisteredAdapter,
} from "../src/adapter-registry.js";
import {
  GODOT_ADAPTER_DESCRIPTOR,
  adaptGodotMsspExport,
  parseGodotMsspExport,
} from "../src/godot-adapter.js";
import {
  validateAdapterConformanceSchema,
  validateAdapterDescriptorSchema,
  validateGodotAdapterInputSchema,
  validateIntermediateModelSchema,
} from "../src/schema.js";

function fixture(): unknown {
  return JSON.parse(
    readFileSync(resolve("examples/godot-adapter/semantic-export.json"), "utf8"),
  ) as unknown;
}

describe("Godot Adapter v0.3", () => {
  it("publishes a schema-valid descriptor through the deterministic adapter registry", () => {
    expect(validateAdapterDescriptorSchema(GODOT_ADAPTER_DESCRIPTOR)).toBe(true);
    expect(listAdapterDescriptors().map((descriptor) => descriptor.id)).toEqual([
      "eml-mssp-export",
      "godot-mssp-export",
      "python-mssp-export",
      "rust-mssp-export",
    ]);
    expect(resolveRegisteredAdapter("godot")?.descriptor.id).toBe("godot-mssp-export");
    expect(resolveRegisteredAdapter("gd")?.descriptor.id).toBe("godot-mssp-export");
    expect(GODOT_ADAPTER_DESCRIPTOR.invariants).toEqual({
      deterministic: true,
      readOnly: true,
      noExecution: true,
      noNetwork: true,
      autoPromotion: false,
      autoMutation: false,
    });
  });

  it("adapts a Godot semantic export into a conformant Intermediate Model", () => {
    const input = fixture();
    expect(validateGodotAdapterInputSchema(input)).toBe(true);

    const model = adaptGodotMsspExport(input, { revision: "fixture-revision" });
    const conformance = evaluateAdapterConformance(GODOT_ADAPTER_DESCRIPTOR, model);

    expect(validateIntermediateModelSchema(model)).toBe(true);
    expect(validateAdapterConformanceSchema(conformance)).toBe(true);
    expect(conformance.ok).toBe(true);
    expect(model.generatedBy.adapter).toBe("godot-mssp-export");
    expect(model.modules.map((module) => module.id)).toEqual([
      "core.world",
      "plugin.dialogue",
    ]);
    expect(model.candidates.map((candidate) => candidate.id)).toEqual([
      "candidate.godot.experimental.telemetry",
    ]);
    expect(model.relations.some((relation) =>
      relation.kind === "requires"
      && relation.from === "plugin.dialogue"
      && relation.to === "core.world"
    )).toBe(true);
    expect(model.project.metadata).toMatchObject({
      godotEngineVersion: "4.5",
      godotMainScene: "scenes/world.tscn",
      godotProjectFeatures: ["4.5", "GL Compatibility"],
      godotRenderer: "gl_compatibility",
      godotScriptingLanguages: ["GDScript"],
    });
    expect(model.modules.find((module) => module.id === "plugin.dialogue")?.metadata).toMatchObject({
      godotBaseType: "EditorPlugin",
      godotClassName: "DialoguePlugin",
      godotComponentKind: "addon",
      godotGroups: ["dialogue"],
      godotIdentity: "res://addons/dialogue/plugin.cfg#Dialogue",
      godotPluginEnabled: true,
      godotPluginName: "Dialogue",
      godotScriptPath: "res://addons/dialogue/plugin.gd",
      godotSignals: ["dialogue_finished", "dialogue_started"],
    });
    expect(model.modules.every((module) => module.source.revision === "fixture-revision")).toBe(true);
  });

  it("keeps an undeclared autoload unclassified even when project metadata names it", () => {
    const input = parseGodotMsspExport(fixture());
    const telemetry = input.components.find((component) => component.id === "experimental.telemetry");
    expect(telemetry?.godotKind).toBe("autoload");
    expect(telemetry?.autoloadName).toBe("Telemetry");
    expect(telemetry?.declaration).toBeUndefined();

    const model = adaptGodotMsspExport(input);
    expect(model.modules.some((module) => module.id === "experimental.telemetry")).toBe(false);
    expect(model.candidates[0]?.status).toBe("unclassified");
    expect(model.candidates[0]?.evidence[0]?.data).toMatchObject({
      autoPromotion: false,
      componentId: "experimental.telemetry",
      godotAutoloadName: "Telemetry",
      godotIdentity: "autoload:Telemetry=res://scripts/telemetry.gd",
      sourceKind: "autoload",
    });
  });

  it("does not mutate the Godot export while adapting it", () => {
    const input = fixture();
    const before = JSON.stringify(input);
    adaptGodotMsspExport(input);
    expect(JSON.stringify(input)).toBe(before);
  });

  it("is deterministic for identical input and options", () => {
    const input = fixture();
    const first = JSON.stringify(adaptGodotMsspExport(input, { revision: "same" }));
    const second = JSON.stringify(adaptGodotMsspExport(input, { revision: "same" }));
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

    expect(() => adaptGodotMsspExport(input)).toThrow(/Invalid Godot MSSP export/);
  });

  it("rejects duplicate component and Godot identities", () => {
    const duplicateId = fixture() as {
      components: Array<Record<string, unknown>>;
    };
    const first = duplicateId.components[0];
    if (!first) throw new Error("fixture component missing");
    duplicateId.components.push(structuredClone(first));
    expect(() => adaptGodotMsspExport(duplicateId)).toThrow(/Godot components contains duplicate identities/);

    const duplicateGodotIdentity = fixture() as {
      components: Array<Record<string, unknown>>;
    };
    const firstIdentity = duplicateGodotIdentity.components[0]?.godotIdentity;
    if (typeof firstIdentity !== "string") throw new Error("fixture Godot identity missing");
    const second = duplicateGodotIdentity.components[1];
    if (!second) throw new Error("fixture second component missing");
    second.godotIdentity = firstIdentity;
    expect(() => adaptGodotMsspExport(duplicateGodotIdentity)).toThrow(/Godot identities contains duplicate identities/);
  });

  it("rejects absolute source paths instead of leaking environment-local provenance", () => {
    const input = fixture() as {
      project: Record<string, unknown>;
    };
    input.project.sourceUri = "/tmp/private/project.godot";
    expect(() => adaptGodotMsspExport(input)).toThrow(/must be repository-relative or a portable logical URI/);
  });
});
