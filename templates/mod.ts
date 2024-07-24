import { Template } from "../deps/@apexlang/apex/config/mod.ts";

const template: Template = {
  info: {
    name: "@wapc",
    description: "waPC module project templates",
  },

  templates: [
    "assemblyscript/mod.ts",
    "rust/mod.ts",
    "tinygo/mod.ts",
  ],
};

export default template;
