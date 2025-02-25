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
  const wasmName = `${(config.config.name as string).replace("-", "_")}.wasm`;

  const mod = urlify("./mod.ts");

  const generates = config.generates || [];
  config.generates = generates;

  generates[`src/generated.rs`] = {
    module: mod,
    config: {
      // handlerInterfaces: ["wapc"],
      // hostInterfaces: ["wapc"],
      serde: true,
    },
  };

  generates[`src/lib.rs`] = {
    ifNotExists: true,
    module: mod,
    config: {
      // handlerInterfaces: ["wapc"],
      // hostInterfaces: ["wapc"],
      serde: true,
      use: "generated",
      derive: {
        _all: ["Debug", "PartialEq", "Default", "Clone"],
      },
    },
  };

  const tasks = config.tasks ||= {};
  const names = new Set<string>(Object.keys(tasks).map((k) => taskName(k)));
  const defaultTasks: Record<string, TaskConfig> = {
    all: {
      description: "Clean, generate, and build",
      deps: ["generate", "clean", "build"],
    },
    deps: {
      description: "Install necessary dependencies",
      cmds: [],
    },
    clean: {
      description: "Clean the build directory",
      cmds: [
        "cargo clean",
        "rm -Rf build",
      ],
    },
    build: {
      description: "Build the module",
      cmds: [
        "mkdir -p build",
        `cargo build --target wasm32-unknown-unknown --release`,
        `cp target/wasm32-unknown-unknown/release/${wasmName} build/`,
      ],
    },
    test: {
      description: "Run tests",
      cmds: ["cargo test"],
    },
  };
  for (const key of Object.keys(defaultTasks)) {
    if (!names.has(taskName(key))) {
      tasks[key] = defaultTasks[key];
    }
  }

  return config;
}
