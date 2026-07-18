import type { MsspAdapterDescriptor, MsspAdapterOptions } from "./adapter.js";
import { EML_ADAPTER_DESCRIPTOR, EML_ADAPTER_ID, adaptEmlMsspExport } from "./eml-adapter.js";
import {
  GODOT_ADAPTER_DESCRIPTOR,
  GODOT_ADAPTER_ID,
  adaptGodotMsspExport,
} from "./godot-adapter.js";
import type { MsspIntermediateModel } from "./model.js";
import {
  PYTHON_ADAPTER_DESCRIPTOR,
  PYTHON_ADAPTER_ID,
  adaptPythonMsspExport,
} from "./python-adapter.js";
import {
  RUST_ADAPTER_DESCRIPTOR,
  RUST_ADAPTER_ID,
  adaptRustMsspExport,
} from "./rust-adapter.js";

export interface RegisteredJsonAdapter {
  aliases: string[];
  descriptor: MsspAdapterDescriptor;
  adapt(input: unknown, options?: MsspAdapterOptions): MsspIntermediateModel;
}

const REGISTERED_ADAPTERS: RegisteredJsonAdapter[] = [
  {
    aliases: ["eml", EML_ADAPTER_ID],
    descriptor: EML_ADAPTER_DESCRIPTOR,
    adapt: adaptEmlMsspExport,
  },
  {
    aliases: ["godot", "gd", GODOT_ADAPTER_ID],
    descriptor: GODOT_ADAPTER_DESCRIPTOR,
    adapt: adaptGodotMsspExport,
  },
  {
    aliases: ["python", "py", PYTHON_ADAPTER_ID],
    descriptor: PYTHON_ADAPTER_DESCRIPTOR,
    adapt: adaptPythonMsspExport,
  },
  {
    aliases: ["rust", "rs", RUST_ADAPTER_ID],
    descriptor: RUST_ADAPTER_DESCRIPTOR,
    adapt: adaptRustMsspExport,
  },
].sort((a, b) => a.descriptor.id.localeCompare(b.descriptor.id));

export function listRegisteredAdapters(): RegisteredJsonAdapter[] {
  return REGISTERED_ADAPTERS.map((adapter) => ({
    aliases: [...adapter.aliases],
    descriptor: adapter.descriptor,
    adapt: adapter.adapt,
  }));
}

export function listAdapterDescriptors(): MsspAdapterDescriptor[] {
  return REGISTERED_ADAPTERS.map((adapter) => adapter.descriptor);
}

export function resolveRegisteredAdapter(name: string): RegisteredJsonAdapter | undefined {
  return REGISTERED_ADAPTERS.find((adapter) => adapter.aliases.includes(name));
}

export function adapterAliasSummary(): string {
  return REGISTERED_ADAPTERS
    .map((adapter) => adapter.aliases[0])
    .filter((value): value is string => value !== undefined)
    .sort((a, b) => a.localeCompare(b))
    .join(", ");
}
