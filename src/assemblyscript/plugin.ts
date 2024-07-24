import * as ast from "../../deps/@apexlang/core/ast/mod.ts";
import { Configuration } from "../../deps/@apexlang/apex/config/mod.ts";
import { TaskConfig } from "../../deps/@apexlang/apex/task/mod.ts";

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
  _doc: ast.Document,
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
  const defaultTasks: Record<string, TaskConfig> = {
    all: {
      description: "Clean, generate, and build",
      deps: ["clean", "generate", "deps", "build"],
    },
    clean: {
      description: "Clean the build directory",
      cmds: ["rm -Rf build"],
    },
    deps: {
      description: "Install necessary dependencies",
      cmds: ["npm install"],
    },
    build: {
      description: "Build the module",
      cmds: ["npm run build"],
    },
    test: {
      description: "Run tests",
      cmds: ["npm run test"],
    },
  };
  for (const key of Object.keys(defaultTasks)) {
    if (!names.has(key)) {
      tasks[key] = defaultTasks[key];
    }
  }

  return config;
}
