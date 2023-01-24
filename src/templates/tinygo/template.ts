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
    name: "@wapc/tinygo",
    description: "waPC TinyGo module project",
    variables: [
      {
        name: "module",
        description: "The module name",
        type: "input",
        prompt: "Please enter the module name",
        default: "github.com/myorg/myservice",
      },
      {
        name: "package",
        description: "The main package name",
        prompt: "Please enter the main package name",
        default: "myservice",
      },
    ],
  },

  async process(_vars): Promise<FSStructure> {
    return {
      variables: {
        plugin: urlify("../../tinygo/plugin.ts"),
      },
      files: [
        ".vscode/extensions.json",
        ".vscode/settings.json",
        ".vscode/tasks.json",
        "apex.axdl",
      ],
      templates: {
        "tmpl": [
          "apex.yaml.tmpl",
          "go.mod.tmpl",
        ],
      },
    };
  },
};

export default template;
