// deno-lint-ignore-file require-await
import {
  FSStructure,
  Template,
} from "https://deno.land/x/apex_cli@v0.0.13/src/config.ts";

const importUrl = new URL(".", import.meta.url);
function urlify(relpath: string): string {
  return new URL(relpath, importUrl).toString();
}

const template: Template = {
  info: {
    name: "@wapc/assemblyscript",
    description: "waPC AssemblyScript module project",
    variables: [
      {
        name: "description",
        description: "The project description",
        type: "input",
        prompt: "Please enter the project description",
      },
      {
        name: "version",
        description: "The project version",
        prompt: "Please enter the version",
        default: "0.0.1",
      },
    ],
  },

  async process(_vars): Promise<FSStructure> {
    return {
      variables: {
        plugin: urlify("../../assemblyscript/plugin.ts"),
      },
      files: [
        ".vscode/extensions.json",
        ".vscode/settings.json",
        ".vscode/tasks.json",
        "assembly/tsconfig.json",
        "apex.axdl",
      ],
      templates: {
        "tmpl": [
          "apex.yaml.tmpl",
          "package.json.tmpl",
        ],
      },
    };
  },
};

export default template;
