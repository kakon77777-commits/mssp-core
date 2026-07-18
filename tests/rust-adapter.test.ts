import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { evaluateAdapterConformance } from "../src/adapter.js";
import {
  listAdapterDescriptors,
  resolveRegisteredAdapter,
} from "../src/adapter-registry.js";
import {
  RUST_ADAPTER_DESCRIPTOR,
  adaptRustMsspExport,
  parseRustMsspExport,
} from "../src/rust-adapter.js";
import {
  validateAdapterConformanceSchema,
  validateAdapterDescriptorSchema,
  validateIntermediateModelSchema,
  validateRustAdapterInputSchema,
} from "../src/schema.js";

function fixture(): unknown {
  return JSON.parse(
    readFileSync(resolve("examples/rust-adapter/semantic-export.json"), "utf8"),
  ) as unknown;
}

describe("Rust Adapter v0.3", () => {
  it("publishes a schema-valid descriptor through the deterministic adapter registry", () => {
    expect(validateAdapterDescriptorSchema(RUST_ADAPTER_DESCRIPTOR)).toBe(true);
    expect(listAdapterDescriptors().map((descriptor) => descriptor.id)).toEqual([
      "agent-skill-mssp-export",
      "eml-mssp-export",
      "godot-mssp-export",
      "python-mssp-export",
      "rust-mssp-export",
    ]);
    expect(resolveRegisteredAdapter("rust")?.descriptor.id).toBe("rust-mssp-export");
    expect(resolveRegisteredAdapter("rs")?.descriptor.id).toBe("rust-mssp-export");
    expect(RUST_ADAPTER_DESCRIPTOR.invariants).toEqual({
      deterministic: true,
      readOnly: true,
      noExecution: true,
      noNetwork: true,
      autoPromotion: false,
      autoMutation: false,
    });
  });

  it("adapts a Rust semantic export into a conformant Intermediate Model", () => {
    const input = fixture();
    expect(validateRustAdapterInputSchema(input)).toBe(true);

    const model = adaptRustMsspExport(input, { revision: "fixture-revision" });
    const conformance = evaluateAdapterConformance(RUST_ADAPTER_DESCRIPTOR, model);

    expect(validateIntermediateModelSchema(model)).toBe(true);
    expect(validateAdapterConformanceSchema(conformance)).toBe(true);
    expect(conformance.ok).toBe(true);
    expect(model.generatedBy.adapter).toBe("rust-mssp-export");
    expect(model.modules.map((module) => module.id)).toEqual([
      "core.document",
      "plugin.markdown",
    ]);
    expect(model.candidates.map((candidate) => candidate.id)).toEqual([
      "candidate.rust.experimental.preview",
    ]);
    expect(model.relations.some((relation) =>
      relation.kind === "requires"
      && relation.from === "plugin.markdown"
      && relation.to === "core.document"
    )).toBe(true);
    expect(model.project.metadata).toMatchObject({
      rustCargoResolver: "2",
      rustEdition: "2024",
      rustToolchainChannel: "stable",
      rustVersion: "1.85",
      rustWorkspaceName: "mssp-rust-example",
    });
    expect(model.modules.find((module) => module.id === "plugin.markdown")?.metadata).toMatchObject({
      rustCargoIdentity: "workspace:mssp-rust-example/package:markdown-plugin/target:lib",
      rustComponentKind: "plugin",
      rustCrateName: "markdown_plugin",
      rustCrateRoot: "crates/markdown-plugin/src/lib.rs",
      rustCrateTypes: ["cdylib", "rlib"],
      rustEdition: "2024",
      rustFeatures: ["default"],
      rustPackageName: "markdown-plugin",
      rustTargetName: "markdown_plugin",
      rustTargetTriples: ["x86_64-unknown-linux-gnu"],
    });
    expect(model.modules.every((module) => module.source.revision === "fixture-revision")).toBe(true);
  });

  it("keeps an undeclared Rust service unclassified even when Cargo exposes a binary target", () => {
    const input = parseRustMsspExport(fixture());
    const preview = input.components.find((component) => component.id === "experimental.preview");
    expect(preview?.rustKind).toBe("service");
    expect(preview?.targetName).toBe("previewd");
    expect(preview?.declaration).toBeUndefined();

    const model = adaptRustMsspExport(input);
    expect(model.modules.some((module) => module.id === "experimental.preview")).toBe(false);
    expect(model.candidates[0]?.status).toBe("unclassified");
    expect(model.candidates[0]?.evidence[0]?.data).toMatchObject({
      autoPromotion: false,
      componentId: "experimental.preview",
      rustCargoIdentity: "workspace:mssp-rust-example/package:preview-service/target:bin:previewd",
      sourceKind: "service",
    });
  });

  it("does not mutate the Rust export while adapting it", () => {
    const input = fixture();
    const before = JSON.stringify(input);
    adaptRustMsspExport(input);
    expect(JSON.stringify(input)).toBe(before);
  });

  it("is deterministic for identical input and options", () => {
    const input = fixture();
    const first = JSON.stringify(adaptRustMsspExport(input, { revision: "same" }));
    const second = JSON.stringify(adaptRustMsspExport(input, { revision: "same" }));
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

    expect(() => adaptRustMsspExport(input)).toThrow(/Invalid Rust MSSP export/);
  });

  it("rejects duplicate component and Cargo identities", () => {
    const duplicateId = fixture() as {
      components: Array<Record<string, unknown>>;
    };
    const first = duplicateId.components[0];
    if (!first) throw new Error("fixture component missing");
    duplicateId.components.push(structuredClone(first));
    expect(() => adaptRustMsspExport(duplicateId)).toThrow(/Rust components contains duplicate identities/);

    const duplicateCargoIdentity = fixture() as {
      components: Array<Record<string, unknown>>;
    };
    const firstCargoIdentity = duplicateCargoIdentity.components[0]?.cargoIdentity;
    if (typeof firstCargoIdentity !== "string") throw new Error("fixture Cargo identity missing");
    const second = duplicateCargoIdentity.components[1];
    if (!second) throw new Error("fixture second component missing");
    second.cargoIdentity = firstCargoIdentity;
    expect(() => adaptRustMsspExport(duplicateCargoIdentity)).toThrow(/Rust Cargo identities contains duplicate identities/);
  });

  it("rejects absolute source paths instead of leaking environment-local provenance", () => {
    const input = fixture() as {
      project: Record<string, unknown>;
    };
    input.project.sourceUri = "/tmp/private/Cargo.toml";
    expect(() => adaptRustMsspExport(input)).toThrow(/must be repository-relative or a portable logical URI/);
  });
});
