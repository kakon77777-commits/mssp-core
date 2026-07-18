import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { evaluateAdapterConformance } from "../src/adapter.js";
import {
  listAdapterDescriptors,
  resolveRegisteredAdapter,
} from "../src/adapter-registry.js";
import {
  PYTHON_ADAPTER_DESCRIPTOR,
  adaptPythonMsspExport,
  parsePythonMsspExport,
} from "../src/python-adapter.js";
import {
  validateAdapterConformanceSchema,
  validateAdapterDescriptorSchema,
  validateIntermediateModelSchema,
  validatePythonAdapterInputSchema,
} from "../src/schema.js";

function fixture(): unknown {
  return JSON.parse(
    readFileSync(resolve("examples/python-adapter/semantic-export.json"), "utf8"),
  ) as unknown;
}

describe("Python Adapter v0.3", () => {
  it("publishes a schema-valid descriptor through the deterministic adapter registry", () => {
    expect(validateAdapterDescriptorSchema(PYTHON_ADAPTER_DESCRIPTOR)).toBe(true);
    expect(listAdapterDescriptors().map((descriptor) => descriptor.id)).toEqual([
      "eml-mssp-export",
      "python-mssp-export",
      "rust-mssp-export",
    ]);
    expect(resolveRegisteredAdapter("python")?.descriptor.id).toBe("python-mssp-export");
    expect(resolveRegisteredAdapter("py")?.descriptor.id).toBe("python-mssp-export");
    expect(PYTHON_ADAPTER_DESCRIPTOR.invariants).toEqual({
      deterministic: true,
      readOnly: true,
      noExecution: true,
      noNetwork: true,
      autoPromotion: false,
      autoMutation: false,
    });
  });

  it("adapts a Python semantic export into a conformant Intermediate Model", () => {
    const input = fixture();
    expect(validatePythonAdapterInputSchema(input)).toBe(true);

    const model = adaptPythonMsspExport(input, { revision: "fixture-revision" });
    const conformance = evaluateAdapterConformance(PYTHON_ADAPTER_DESCRIPTOR, model);

    expect(validateIntermediateModelSchema(model)).toBe(true);
    expect(validateAdapterConformanceSchema(conformance)).toBe(true);
    expect(conformance.ok).toBe(true);
    expect(model.generatedBy.adapter).toBe("python-mssp-export");
    expect(model.modules.map((module) => module.id)).toEqual([
      "core.document",
      "plugin.markdown",
    ]);
    expect(model.candidates.map((candidate) => candidate.id)).toEqual([
      "candidate.python.experimental.preview",
    ]);
    expect(model.relations.some((relation) =>
      relation.kind === "requires"
      && relation.from === "plugin.markdown"
      && relation.to === "core.document"
    )).toBe(true);
    expect(model.project.metadata).toMatchObject({
      pythonBuildBackend: "hatchling.build",
      pythonDistributionName: "mssp-python-example",
      pythonRequires: ">=3.11",
    });
    expect(model.modules.find((module) => module.id === "plugin.markdown")?.metadata).toMatchObject({
      pythonComponentKind: "plugin",
      pythonImportPath: "example.plugins.markdown",
      pythonQualifiedName: "example.plugins.markdown",
      pythonEntryPoints: ["mssp.plugins:markdown=example.plugins.markdown:plugin"],
    });
    expect(model.modules.every((module) => module.source.revision === "fixture-revision")).toBe(true);
  });

  it("keeps an undeclared Python service unclassified even when it exposes an entry point", () => {
    const input = parsePythonMsspExport(fixture());
    const preview = input.components.find((component) => component.id === "experimental.preview");
    expect(preview?.pythonKind).toBe("service");
    expect(preview?.entryPoints).toHaveLength(1);
    expect(preview?.declaration).toBeUndefined();

    const model = adaptPythonMsspExport(input);
    expect(model.modules.some((module) => module.id === "experimental.preview")).toBe(false);
    expect(model.candidates[0]?.status).toBe("unclassified");
    expect(model.candidates[0]?.evidence[0]?.data).toMatchObject({
      autoPromotion: false,
      componentId: "experimental.preview",
      pythonQualifiedName: "example.experimental.preview",
      sourceKind: "service",
    });
  });

  it("does not mutate the Python export while adapting it", () => {
    const input = fixture();
    const before = JSON.stringify(input);
    adaptPythonMsspExport(input);
    expect(JSON.stringify(input)).toBe(before);
  });

  it("is deterministic for identical input and options", () => {
    const input = fixture();
    const first = JSON.stringify(adaptPythonMsspExport(input, { revision: "same" }));
    const second = JSON.stringify(adaptPythonMsspExport(input, { revision: "same" }));
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

    expect(() => adaptPythonMsspExport(input)).toThrow(/Invalid Python MSSP export/);
  });

  it("rejects duplicate component and qualified-name identities", () => {
    const duplicateId = fixture() as {
      components: Array<Record<string, unknown>>;
    };
    const first = duplicateId.components[0];
    if (!first) throw new Error("fixture component missing");
    duplicateId.components.push(structuredClone(first));
    expect(() => adaptPythonMsspExport(duplicateId)).toThrow(/Python components contains duplicate identities/);

    const duplicateQualifiedName = fixture() as {
      components: Array<Record<string, unknown>>;
    };
    const firstQualified = duplicateQualifiedName.components[0]?.qualifiedName;
    if (typeof firstQualified !== "string") throw new Error("fixture qualified name missing");
    const second = duplicateQualifiedName.components[1];
    if (!second) throw new Error("fixture second component missing");
    second.qualifiedName = firstQualified;
    expect(() => adaptPythonMsspExport(duplicateQualifiedName)).toThrow(/Python qualified names contains duplicate identities/);
  });

  it("rejects absolute source paths instead of leaking environment-local provenance", () => {
    const input = fixture() as {
      project: Record<string, unknown>;
    };
    input.project.sourceUri = "/tmp/private/pyproject.toml";
    expect(() => adaptPythonMsspExport(input)).toThrow(/must be repository-relative or a portable logical URI/);
  });
});
