import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildGraph, buildGraphFromModel } from "../src/graph.js";
import { loadProject } from "../src/io.js";
import { buildIntermediateModel } from "../src/model.js";
import { validateIntermediateModelSchema } from "../src/schema.js";

const example = resolve("examples/hello-mssp");

describe("MSSP Intermediate Model v0.2", () => {
  it("builds a schema-valid language-neutral model", () => {
    const project = loadProject(example);
    const model = buildIntermediateModel(project, { revision: "test-revision" });

    expect(model.schemaVersion).toBe("0.2");
    expect(model.kind).toBe("mssp-intermediate-model");
    expect(model.project.id).toBe(project.manifest.id);
    expect(model.modules.length).toBe(project.modules.length);
    expect(model.project.source.uri).toBe("mssp.yaml");
    expect(model.project.source.revision).toBe("test-revision");
    expect(validateIntermediateModelSchema(model)).toBe(true);
  });

  it("normalizes sources, ordering, and dependency evidence", () => {
    const model = buildIntermediateModel(loadProject(example));
    const moduleIds = model.modules.map((module) => module.id);
    const sortedIds = [...moduleIds].sort((a, b) => a.localeCompare(b));
    const dependency = model.relations.find((relation) =>
      relation.kind === "requires"
      && relation.from === "plugin.uppercase"
      && relation.to === "core.echo"
    );

    expect(moduleIds).toEqual(sortedIds);
    expect(model.modules.every((module) => !module.source.uri.startsWith("/"))).toBe(true);
    expect(dependency?.evidence[0]?.data).toEqual({ field: "requires.modules" });
  });

  it("is deterministic for the same loaded project", () => {
    const project = loadProject(example);
    const first = JSON.stringify(buildIntermediateModel(project));
    const second = JSON.stringify(buildIntermediateModel(project));

    expect(second).toBe(first);
  });

  it("drives the architecture graph through the neutral model", () => {
    const project = loadProject(example);
    const model = buildIntermediateModel(project);

    expect(buildGraphFromModel(model)).toEqual(buildGraph(project));
  });
});
