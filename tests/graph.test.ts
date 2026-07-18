import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { loadProject } from "../src/io.js";
import { buildGraph, graphToMermaid } from "../src/graph.js";

describe("architecture graph", () => {
  it("generates Mermaid nodes and dependency edges", () => {
    const graph = buildGraph(loadProject(resolve("examples/hello-mssp")));
    const mermaid = graphToMermaid(graph);
    expect(mermaid).toContain("flowchart LR");
    expect(mermaid).toContain("plugin_uppercase -->|requires| core_echo");
    expect(graph.nodes).toHaveLength(5);
  });
});
