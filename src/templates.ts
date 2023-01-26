import { Template } from "https://deno.land/x/apex_cli@v0.0.12/src/config.ts";

const template: Template = {
  info: {
    name: "@wapc",
    description: "waPC module project templates",
  },

  templates: [
    "templates/assemblyscript/template.ts",
    "templates/rust/template.ts",
    "templates/tinygo/template.ts",
  ],
};

export default template;
