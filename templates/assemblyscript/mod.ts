// deno-lint-ignore-file require-await
import { FSStructure, Template } from "../../deps/@apexlang/apex/config/mod.ts";
import { importPlugin } from "../../deps/@apexlang/codegen/utils/mod.ts";

const template: Template = {
  info: {
    name: "@wapc/assemblyscript",
    description: "waPC AssemblyScript module project",
    variables: [
      {
        name: "description",
        description: "The module description",
        type: "input",
        prompt: "Please enter the module description",
      },
      {
        name: "version",
        description: "The module version",
        type: "input",
        prompt: "Please enter the version",
        default: "0.0.1",
      },
      {
        name: "author",
        description: "The module author",
        type: "input",
        prompt: "Please enter the author",
        default: "unknown",
      },
    ],
  },

  // deno-lint-ignore no-explicit-any
  async process(_vars: any): Promise<FSStructure> {
    return {
      variables: {
        plugin_assemblyscript: importPlugin(import.meta.url, "assemblyscript"),
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
