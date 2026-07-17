export async function execute(request, core, selectedPlugin) {
  const base = core.echo(request.text);
  return selectedPlugin ? selectedPlugin(base) : base;
}
