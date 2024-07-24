// deno-lint-ignore-file require-await
import { FSStructure, Template } from "../../deps/@apexlang/apex/config/mod.ts";
import { importPlugin } from "../../deps/@apexlang/codegen/utils/mod.ts";

const template: Template = {
  info: {
    name: "@wapc/rust",
    description: "waPC Rust module project",
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
        plugin_rust: importPlugin(import.meta.url, "rust"),
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
          "Cargo.toml.tmpl",
        ],
      },
    };
  },
};

export default template;
