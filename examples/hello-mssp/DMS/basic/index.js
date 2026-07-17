export function diagnose(event) {
  return { status: event?.status ?? "unknown", source: event?.source ?? "unknown" };
}
