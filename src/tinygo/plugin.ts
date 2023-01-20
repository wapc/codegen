import { Configuration } from "https://deno.land/x/apex_cli@v0.0.12/src/config.ts";
import * as apex from "../deps/core/mod.ts";

const importUrl = new URL(".", import.meta.url);
function urlify(relpath: string): string {
  return new URL(relpath, importUrl).toString();
}

interface Alias {
  type: string;
  import?: string;
  format?: string;
  parse?: string;
}
type Aliases = Record<string, Alias>;

function taskName(taskExpr: string): string {
  const idx = taskExpr.indexOf(">");
  if (idx != -1) {
    return taskExpr.substring(idx).trim();
  }
  return taskExpr.trim();
}

export default function (
  doc: apex.ast.Document,
  config: Configuration,
): Configuration {
  config.config ||= {};
  config.config.aliases ||= {};
  config.generates ||= {};

  const interfaces = doc.definitions
    .filter((d) => d.isKind(apex.ast.Kind.InterfaceDefinition))
    .map((d) => d as apex.ast.InterfaceDefinition);

  const hasServices = interfaces
    .find((i) => {
      return i.annotation("service") != undefined ||
        i.annotation("events") != undefined ||
        i.annotation("actor") != undefined;
    }) != undefined;

  const aliases = config.config.aliases as Aliases;
  if (!aliases.UUID) {
    aliases["UUID"] = {
      type: "uuid.UUID",
      import: "github.com/google/uuid",
      format: "String",
      parse: "uuid.Parse",
    };
  }

  const { module, package: pkg } = config.config;
  config.config.name ||= module;

  const mod = urlify("./mod.ts");

  const generates = config.generates || [];
  config.generates = generates;

  generates[`cmd/main.go`] = {
    //ifNotExists: true,
    module: mod,
    visitorClass: `MainVisitor`,
    config: {
      import: `${module}/pkg/${pkg}`,
    },
  };

  const apexCodegenMod = "https://deno.land/x/apex_codegen@v0.1.6/go/mod.ts";
  const iotaCodegenMod = "https://deno.land/x/iota_codegen@v0.1.6/go/mod.ts";

  generates[`pkg/${pkg}/wapc.go`] = {
    module: apexCodegenMod,
    visitorClass: "GoVisitor",
    append: [
      {
        module: apexCodegenMod,
        visitorClass: "InterfacesVisitor",
      },
      {
        module: apexCodegenMod,
        visitorClass: "MsgPackVisitor",
      },
      {
        module: mod,
        visitorClass: "ExportVisitor",
      },
    ],
  };

  if (hasServices) {
    generates[`pkg/${pkg}/services.go`] = {
      ifNotExists: true,
      module: apexCodegenMod,
      visitorClass: `ScaffoldVisitor`,
      config: {
        types: ["service", "events", "actors"],
      },
    };
  }

  const tasks = config.tasks ||= {};
  const names = new Set<string>(Object.keys(tasks).map((k) => taskName(k)));
  const defaultTasks: Record<string, string[]> = {
    "all > generate deps clean build": [],
    clean: [
      "rm -Rf build",
    ],
    deps: [
      "go mod tidy",
    ],
    build: [
      "mkdir -p build",
      `tinygo build -o build/${config.config.name}.wasm --scheduler=none --target=wasi -no-debug cmd/main.go`,
    ],
    test: [
      "go test --count=1 ./pkg/...",
    ],
  };
  for (const key of Object.keys(defaultTasks)) {
    if (!names.has(taskName(key))) {
      tasks[key] = defaultTasks[key];
    }
  }

  return config;
}
