/*
Copyright 2025 The waPC Authors.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { Context, Writer } from "../../deps/@apexlang/core/model/mod.ts";
import {
  camelCase,
  InterfaceUsesVisitor,
  isService,
  UsesVisitor,
} from "../../deps/@apexlang/codegen/utils/mod.ts";
import { getImports, GoVisitor } from "../../deps/@apexlang/codegen/go/mod.ts";

export class MainVisitor extends GoVisitor {
  // Overridable visitor implementations
  usesVisitor = (writer: Writer): UsesVisitor =>
    new InterfaceUsesVisitor(writer);
  uses: UsesVisitor | undefined = undefined;

  override writeHead(context: Context): void {
    const prev = context.config.package;
    context.config.package = "main";
    super.writeHead(context);
    context.config.package = prev;
  }

  override visitNamespaceBefore(context: Context): void {
    const prefixPkg = (context.config.prefixPkg || `pkg/`).replace(
      /^\.\//g,
      "",
    );
    const pkg = context.config.package || "module";
    const module = context.config.module || "github.com/myorg/mymodule";
    const importPath = context.config.import ||
      `${module}/${prefixPkg}${pkg}`;
    super.visitNamespaceBefore(context);

    this.uses = this.usesVisitor(this.writer);
    context.namespace.accept(context, this.uses);

    getImports(context).firstparty(importPath);
  }

  override visitAllOperationsBefore(context: Context): void {
    this.write(`\n`);

    this.write(`//go:wasmexport wapc_init
func Initialize() {\n`);
    const packageName = context.config["package"] || "module";
    this.write(`// Create providers\n`);
    this.uses!.dependencies.forEach((dependency) => {
      this.write(
        `${
          camelCase(
            dependency,
          )
        }Provider := ${packageName}.New${dependency}()\n`,
      );
    });

    this.write(`\n\n// Create services\n`);
    this.uses!.services.forEach((dependencies, service) => {
      const deps = dependencies
        .map((d) => camelCase(d) + "Provider")
        .join(", ");
      this.write(
        `${
          camelCase(
            service,
          )
        }Service := ${packageName}.New${service}(${deps})\n`,
      );
    });

    this.write(`\n\n// Register services\n`);
    const registration = new HandlerRegistrationVisitor(this.writer);
    context.namespace.accept(context, registration);
    this.write(`}\n`);
  }
}

class HandlerRegistrationVisitor extends GoVisitor {
  override visitInterface(context: Context): void {
    if (!isService(context)) {
      return;
    }
    const packageName = context.config["package"] || "module";
    const { interface: iface } = context;

    this.write(
      `\t\t${packageName}.Register${iface.name}(${
        camelCase(
          iface.name,
        )
      }Service)\n`,
    );
  }
}
