export function route(request) {
  return request?.transform === "uppercase" ? "plugin.uppercase" : null;
}
