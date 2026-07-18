import { buildIntermediateModel } from "./model.js";
import type { MsspIntermediateModel } from "./model.js";
import type { LoadedProject, MsspLayer } from "./types.js";

export interface GraphNode {
  id: string;
  label: string;
  layer: MsspLayer;
  version: string;
  purpose: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  kind: "requires";
}

export interface MsspGraph {
  project: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export function buildGraphFromModel(model: MsspIntermediateModel): MsspGraph {
  return {
    project: model.project.id,
    nodes: model.modules.map((module) => ({
      id: module.id,
      label: module.name,
      layer: module.layer,
      version: module.version,
      purpose: module.purpose,
    })),
    edges: model.relations
      .filter((relation) => relation.kind === "requires")
      .map((relation) => ({
        from: relation.from,
        to: relation.to,
        kind: "requires" as const,
      })),
  };
}

export function buildGraph(project: LoadedProject): MsspGraph {
  return buildGraphFromModel(buildIntermediateModel(project));
}

function mermaidId(id: string): string {
  return id.replace(/[^A-Za-z0-9_]/g, "_");
}

function escapeLabel(value: string): string {
  return value.replace(/"/g, "&quot;");
}

export function graphToMermaid(graph: MsspGraph): string {
  const lines = ["flowchart LR"];
  for (const node of graph.nodes) {
    lines.push(
      `  ${mermaidId(node.id)}["${escapeLabel(node.label)}<br/>${node.layer}"]`,
    );
  }
  for (const edge of graph.edges) {
    lines.push(`  ${mermaidId(edge.from)} -->|requires| ${mermaidId(edge.to)}`);
  }
  lines.push("  classDef FMS stroke-dasharray: 5 5");
  for (const layer of ["FMS", "SCL", "SMS", "TMS", "DMS", "ROUTER", "RUNTIME"]) {
    const ids = graph.nodes.filter((node) => node.layer === layer).map((node) => mermaidId(node.id));
    if (ids.length) lines.push(`  class ${ids.join(",")} ${layer}`);
  }
  return `${lines.join("\n")}\n`;
}
