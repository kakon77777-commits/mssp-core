import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  EML_ADAPTER_DESCRIPTOR,
  adaptEmlMsspExport,
  parseEmlMsspExport,
} from "../src/eml-adapter.js";
import { evaluateAdapterConformance } from "../src/adapter.js";
import {
  validateAdapterDescriptorSchema,
  validateEmlAdapterInputSchema,
  validateIntermediateModelSchema,
} from "../src/schema.js";

function fixture(): unknown {
  return JSON.parse(
    readFileSync(resolve("examples/eml-adapter/semantic-export.json"), "utf8"),
  ) as unknown;
}

describe("MSSP Adapter Contract v0.3 and EML adapter", () => {
  it("publishes a schema-valid read-only adapter descriptor", () => {
    expect(validateAdapterDescriptorSchema(EML_ADAPTER_DESCRIPTOR)).toBe(true);
    expect(EML_ADAPTER_DESCRIPTOR.invariants).toEqual({
      deterministic: true,
      readOnly: true,
      noExecution: true,
      noNetwork: true,
      autoPromotion: false,
      autoMutation: false,
    });
  });

  it("adapts an EML semantic export into a schema-valid Intermediate Model", () => {
    const input = fixture();
    expect(validateEmlAdapterInputSchema(input)).toBe(true);

    const model = adaptEmlMsspExport(input, { revision: "fixture-revision" });

    expect(validateIntermediateModelSchema(model)).toBe(true);
    expect(model.generatedBy.adapter).toBe("eml-mssp-export");
    expect(model.modules.map((module) => module.id)).toEqual([
      "core.echo",
      "plugin.uppercase",
    ]);
    expect(model.candidates.map((candidate) => candidate.id)).toEqual([
      "candidate.eml.experimental.preview",
    ]);
    expect(model.relations.some((relation) =>
      relation.kind === "requires"
      && relation.from === "plugin.uppercase"
      && relation.to === "core.echo"
    )).toBe(true);
    expect(model.modules.every((module) => module.source.revision === "fixture-revision")).toBe(true);
    expect(evaluateAdapterConformance(EML_ADAPTER_DESCRIPTOR, model).ok).toBe(true);
  });

  it("keeps a module-shaped EML symbol unclassified without an explicit declaration", () => {
    const input = parseEmlMsspExport(fixture());
    const preview = input.symbols.find((symbol) => symbol.id === "experimental.preview");
    expect(preview?.symbolKind).toBe("module");
    expect(preview?.declaration).toBeUndefined();

    const model = adaptEmlMsspExport(input);
    expect(model.modules.some((module) => module.id === "experimental.preview")).toBe(false);
    expect(model.candidates[0]?.status).toBe("unclassified");
    expect(model.candidates[0]?.evidence[0]?.data).toMatchObject({
      autoPromotion: false,
      symbolId: "experimental.preview",
    });
  });

  it("does not mutate the EML export while adapting it", () => {
    const input = fixture();
    const before = JSON.stringify(input);
    adaptEmlMsspExport(input);
    expect(JSON.stringify(input)).toBe(before);
  });

  it("is deterministic for identical input and options", () => {
    const input = fixture();
    const first = JSON.stringify(adaptEmlMsspExport(input, { revision: "same" }));
    const second = JSON.stringify(adaptEmlMsspExport(input, { revision: "same" }));
    expect(second).toBe(first);
  });

  it("rejects incomplete declarations instead of filling contract fields", () => {
    const input = fixture() as {
      symbols: Array<Record<string, unknown>>;
    };
    const first = input.symbols[0];
    if (!first) throw new Error("fixture symbol missing");
    first.declaration = {
      version: "1.0.0",
      layer: "SMS",
      purpose: "Incomplete declaration",
    };

    expect(() => adaptEmlMsspExport(input)).toThrow(/Invalid EML MSSP export/);
  });

  it("rejects duplicate EML symbol identities", () => {
    const input = fixture() as {
      symbols: Array<Record<string, unknown>>;
    };
    const first = input.symbols[0];
    if (!first) throw new Error("fixture symbol missing");
    input.symbols.push(structuredClone(first));

    expect(() => adaptEmlMsspExport(input)).toThrow(/duplicate identities/);
  });
});
