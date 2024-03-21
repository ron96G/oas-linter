export function stringifyJsonYaml(jsonOrYaml: any): string {
  if (typeof jsonOrYaml === "string") {
    return jsonOrYaml;
  }
  if (typeof jsonOrYaml === "object") {
    return JSON.stringify(jsonOrYaml, null, 2);
  }
  throw new Error("Invalid input");
}
