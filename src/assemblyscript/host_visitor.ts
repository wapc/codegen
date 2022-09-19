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

import { Context, BaseVisitor } from "@apexlang/core/model";
import {
  camelCase,
  capitalize,
  formatComment,
  isObject,
  isProvider,
  isVoid,
} from "@apexlang/codegen/utils";
import { expandType, read, strQuote, write } from "./helpers";

export class HostVisitor extends BaseVisitor {
  visitOperation(context: Context): void {
    if (!isProvider(context)) {
      return;
    }
    if (context.config.hostPreamble != true) {
      const className = context.config.hostClassName || "Host";
      this.write(`
      import { hostCall, Result } from "@wapc/as-guest";
      export class ${className} {
      binding: string;
  
      constructor(binding: string = "default") {
        this.binding = binding;
      }\n`);
      context.config.hostPreamble = true;
    }
    this.write(`\n`);
    const { operation } = context;
    this.write(formatComment("  // ", operation.description));
    this.write(`  ${camelCase(operation.name)}(`);
    operation.parameters.map((param, index) => {
      if (index > 0) {
        this.write(`, `);
      }
      this.write(`${param.name}: ${expandType(param.type, true)}`);
    });
    const returnType = expandType(operation.type, true);
    this.write(`): `);
    const retVoid = isVoid(operation.type);
    if (retVoid) {
      this.write(`Error | null {\n`);
    } else {
      this.write(`Result<${returnType}> {\n`);
    }

    this.write(`  `);
    if (operation.parameters.length == 0) {
      this.write(
        `const result = hostCall(this.binding, ${strQuote(
          context.namespace.name
        )}, ${strQuote(operation.name)}, new ArrayBuffer(0));\n`
      );
    } else if (operation.isUnary()) {
      const unaryParam = operation.parameters[0];
      if (isObject(unaryParam.type)) {
        this.write(
          `const result = hostCall(this.binding, ${strQuote(
            context.namespace.name
          )}, ${strQuote(operation.name)}, ${
            operation.unaryOp().name
          }.toBuffer());\n`
        );
      } else {
        this.write(`const sizer = new Sizer();
        ${write(
          "sizer",
          "",
          "",
          unaryParam.name,
          unaryParam.type,
          false
        )}const ua = new ArrayBuffer(sizer.length);
        const encoder = new Encoder(ua);
        ${write("encoder", "", "", unaryParam.name, unaryParam.type, false)}`);
        this.write(
          `const result = hostCall(this.binding, ${strQuote(
            context.namespace.name
          )}, ${strQuote(operation.name)}, ua);\n`
        );
      }
    } else {
      this.write(
        `const inputArgs = new ${capitalize(operation.name)}Args();\n`
      );
      operation.parameters.map((param) => {
        const paramName = param.name;
        this.write(`  inputArgs.${paramName} = ${paramName};\n`);
      });
      this.write(`const result = hostCall(
      this.binding,
      ${strQuote(context.namespace.name)},
      ${strQuote(operation.name)},
      inputArgs.toBuffer()
    );\n`);
    }
    if (retVoid) {
      this.write(`return result.error()\n`);
    } else {
      this.write(`if (!result.isOk) {
        return Result.error<${returnType}>(result.error()!);
      }\n`);
    }
    if (!retVoid) {
      if (isObject(operation.type)) {
        this.write(`    const decoder = new Decoder(result.get());\n`);
        this.write(
          `    const ret = ${expandType(
            operation.type,
            false
          )}.decode(decoder);\n`
        );
        this.write(`if (decoder.error()) {
          return Result.error<${returnType}>(decoder.error()!)
        }
        return Result.ok(ret);\n`);
      } else {
        this.write(`    const decoder = new Decoder(result.get());\n`);
        this.write(`const ${read("payload", operation.type, false)}`);
        this.write(`if (decoder.error()) {
          return Result.error<${returnType}>(decoder.error()!)
        }\n`);
        this.write(`  return Result.ok(payload);\n`);
      }
    }
    this.write(`  }\n`);
    super.triggerOperation(context);
  }

  visitAllOperationsAfter(context: Context): void {
    if (context.config.hostPreamble == true) {
      this.write(`}\n\n`);
      delete context.config.hostPreamble;
    }
    super.triggerAllOperationsAfter(context);
  }
}
