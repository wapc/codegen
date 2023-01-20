import { Configuration } from "https://deno.land/x/apex_cli@v0.0.12/src/config.ts";
import * as apex from "../deps/core/mod.ts";

const importUrl = new URL(".", import.meta.url);
function urlify(relpath: string): string {
  return new URL(relpath, importUrl).toString();
}

function taskName(taskExpr: string): string {
  const idx = taskExpr.indexOf(">");
  if (idx != -1) {
    return taskExpr.substring(idx).trim();
  }
  return taskExpr.trim();
}

export default function (
  _doc: apex.ast.Document,
  config: Configuration,
): Configuration {
  config.config ||= {};
  config.generates ||= {};

  const { module } = config.config;
  config.config.name ||= module;

  const mod = urlify("./mod.ts");

  const generates = config.generates || [];
  config.generates = generates;

  generates[`assembly/module.ts`] = {
    module: mod,
    visitorClass: "ModuleVisitor",
  };

  generates[`assembly/index.ts`] = {
    ifNotExists: true,
    module: mod,
    visitorClass: "ScaffoldVisitor",
    config: {
      package: "./module",
    },
  };

  const tasks = config.tasks ||= {};
  const names = new Set<string>(Object.keys(tasks).map((k) => taskName(k)));
  const defaultTasks: Record<string, string[]> = {
    "all > generate deps clean build": [],
    clean: [
      "rm -Rf build",
    ],
    deps: ["npm install"],
    build: [
      "npm run build",
    ],
    "test": [
      "npm run test",
    ],
  };
  for (const key of Object.keys(defaultTasks)) {
    if (!names.has(taskName(key))) {
      tasks[key] = defaultTasks[key];
    }
  }

  return config;
}
