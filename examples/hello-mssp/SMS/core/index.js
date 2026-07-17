export function echo(text) {
  if (typeof text !== "string") throw new TypeError("text must be a string");
  return text;
}
