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

import {
  capitalize,
  formatComment,
  isHandler,
  isVoid,
} from "../../deps/@apexlang/codegen/utils/mod.ts";
import { BaseVisitor, Context } from "../../deps/@apexlang/core/model/mod.ts";
import { expandType, mapArg, mapArgs } from "./helpers.ts";

export class HandlersVisitor extends BaseVisitor {
  override visitOperation(context: Context): void {
    if (!isHandler(context)) {
      return;
    }
    if (context.config.handlerPreamble != true) {
      const className = context.config.handlersClassName || "Handlers";
      this.write(`
      import { register, Result } from "@wapc/as-guest";
      export { Result } from "@wapc/as-guest";
      export class ${className} {\n`);
      context.config.handlerPreamble = true;
    }
    this.write(`\n`);
    const { namespace: ns, interface: iface, operation } = context;
    let opVal = "";
    this.write(formatComment("  // ", operation.description));
    opVal += `static register${capitalize(operation.name)}(handler: (`;
    if (operation.isUnary()) {
      opVal += mapArg(operation.unaryOp());
    } else {
      opVal += mapArgs(operation.parameters);
    }
    opVal += `) => `;
    if (isVoid(operation.type)) {
      opVal += `Error | null`;
    } else {
      opVal += `Result<${expandType(operation.type, true)}>`;
    }
    opVal += `): void {\n`;
    opVal += `${operation.name}Handler = handler;\n`;
    opVal +=
      `register("${ns.name}.${iface.name}/${operation.name}", ${operation.name}Wrapper);\n}\n`;
    this.write(opVal);
    super.triggerOperation(context);
  }

  override visitAllOperationsAfter(context: Context): void {
    if (context.config.handlerPreamble == true) {
      this.write(`}\n\n`);
      delete context.config.handlerPreamble;
    }
    super.triggerAllOperationsAfter(context);
  }
}
