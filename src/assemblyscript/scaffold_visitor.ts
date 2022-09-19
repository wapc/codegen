/*
Copyright 2022 The waPC Authors.

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

import { capitalize, isHandler, isVoid } from "@apexlang/codegen/utils";
import { Context, BaseVisitor } from "@apexlang/core/model";
import { expandType, mapArgs, defaultValueForType } from "./helpers";

export class ScaffoldVisitor extends BaseVisitor {
  visitNamespaceBefore(context: Context): void {
    super.visitNamespaceBefore(context);
    const typesVisitor = new TypesVisitor(this.writer);
    context.namespace.accept(context, typesVisitor);
  }

  visitAllOperationsBefore(context: Context): void {
    const registration = new HandlerRegistrationVisitor(this.writer);
    context.namespace.accept(context, registration);
  }

  visitOperation(context: Context): void {
    if (!isHandler(context)) {
      return;
    }
    const { operation } = context;
    this.write(`\n`);
    const expanded = expandType(operation.type, true);
    this.write(`function ${operation.name}(${mapArgs(operation.parameters)}):`);
    if (isVoid(operation.type)) {
      this.write(`Error | null\n`);
    } else {
      this.write(`Result<${expanded}>`);
    }
    this.write(` {\n`);
    if (!isVoid(operation.type)) {
      const dv = defaultValueForType(operation.type);
      this.write(
        `  return Result.error<${expanded}>(new Error("not implemented"));\n`
      );
    } else {
      this.write(`return null\n`);
    }
    this.write(`}\n`);
  }

  visitNamespaceAfter(context: Context): void {
    this.write(`\n`);
    this.write(`// Boilerplate code for waPC.  Do not remove.\n\n`);
    this.write(`import { handleCall, handleAbort } from "@wapc/as-guest";\n\n`);
    this
      .write(`export function __guest_call(operation_size: usize, payload_size: usize): bool {
  return handleCall(operation_size, payload_size);
}

// Abort function
function abort(
  message: string | null,
  fileName: string | null,
  lineNumber: u32,
  columnNumber: u32
): void {
  handleAbort(message, fileName, lineNumber, columnNumber);
}\n`);
  }
}

class HandlerRegistrationVisitor extends BaseVisitor {
  visitAllOperationsBefore(context: Context): void {
    this.write(`export function wapc_init(): void {\n`);
  }

  visitOperation(context: Context): void {
    if (!isHandler(context)) {
      return;
    }
    const { operation } = context;
    this.write(
      `  Handlers.register${capitalize(operation.name)}(${operation.name});\n`
    );
  }

  visitAllOperationsAfter(context: Context): void {
    this.write(`}\n`);
  }
}

class TypesVisitor extends BaseVisitor {
  hasOperations: boolean = false;
  hasObjects: boolean = false;

  visitOperation(context: Context): void {
    if (isHandler(context)) {
      this.hasOperations = true;
    }
  }

  visitType(context: Context): void {
    if (!this.hasObjects) {
      this.write(`import { `);
      this.hasObjects = true;
    } else {
      this.write(`, `);
    }
    this.write(`${context.type!.name}`);
  }

  visitTypesAfter(context: Context): void {
    if (this.hasOperations) {
      if (!this.hasObjects) {
        this.write(`import { `);
      }
      const className = context.config.handlersClassName || "Handlers";
      if (this.hasObjects) {
        this.write(`, `);
      }
      this.write(`${className}`);
      this.hasObjects = true;
    }

    if (this.hasObjects || this.hasOperations) {
      const packageName = context.config.package || "./module";
      this.write(`, Result } from "${packageName}";\n`);
    }
  }
}
