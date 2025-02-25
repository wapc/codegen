// deno-lint-ignore-file require-await
import { FSStructure, Template } from "../../deps/@apexlang/apex/config/mod.ts";
import { importPlugin } from "../../deps/@apexlang/codegen/utils/mod.ts";

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

  // deno-lint-ignore no-explicit-any
  async process(_vars: any): Promise<FSStructure> {
    return {
      variables: {
        plugin_tinygo: importPlugin(import.meta.url, "tinygo"),
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
