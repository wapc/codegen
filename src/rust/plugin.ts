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
  const wasmName = `${(config.config.name as string).replace("-", "_")}.wasm`;

  const mod = urlify("./mod.ts");

  const generates = config.generates || [];
  config.generates = generates;

  generates[`src/generated.rs`] = {
    module: mod,
    config: {
      handlerInterfaces: ["wapc"],
      hostInterfaces: ["wapc"],
      serde: true,
    },
  };

  generates[`src/lib.rs`] = {
    ifNotExists: true,
    module: mod,
    config: {
      handlerInterfaces: ["wapc"],
      hostInterfaces: ["wapc"],
      serde: true,
      use: "generated",
      derive: {
        _all: ["Debug", "PartialEq", "Default", "Clone"],
      },
    },
  };

  const tasks = config.tasks ||= {};
  const names = new Set<string>(Object.keys(tasks).map((k) => taskName(k)));
  const defaultTasks: Record<string, string[]> = {
    "all > generate deps clean build": [],
    clean: [
      "cargo clean",
      "rm -Rf build",
    ],
    deps: [],
    build: [
      "mkdir -p build",
      `cargo build --target wasm32-unknown-unknown --release`,
      `cp target/wasm32-unknown-unknown/release/${wasmName} build/`,
    ],
    "test > build": [
      "cargo test",
    ],
  };
  for (const key of Object.keys(defaultTasks)) {
    if (!names.has(taskName(key))) {
      tasks[key] = defaultTasks[key];
    }
  }

  return config;
}
