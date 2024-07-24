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

import { Context } from "../../deps/@apexlang/core/model/mod.ts";
import {
  expandType,
  getImporter,
  GoVisitor,
  mapParam,
  mapParams,
  translateAlias,
} from "../../deps/@apexlang/codegen/go/mod.ts";
import {
  capitalize,
  formatComment,
  isService,
  isVoid,
  uncapitalize,
} from "../../deps/@apexlang/codegen/utils/mod.ts";
import { IMPORTS } from "./constants.ts";

export class HandlersVisitor extends GoVisitor {
  override visitOperation(context: Context): void {
    if (!isService(context)) {
      return;
    }
    const tr = translateAlias(context);
    if (context.config.handlerPreamble != true) {
      const className = context.config.handlersClassName || "Handlers";
      this.write(`type ${className} struct {\n`);
      context.config.handlerPreamble = true;
    }
    const operation = context.operation!;
    this.write(formatComment("    // ", operation.description));
    this.write(`${capitalize(operation.name)} func(`);
    if (operation.isUnary()) {
      this.write(mapParam(context, operation.unaryOp()));
    } else {
      this.write(mapParams(context, operation.parameters));
    }
    this.write(`)`);
    if (!isVoid(operation.type)) {
      this.write(
        ` (${expandType(operation.type, undefined, true, tr)}, error)`,
      );
    } else {
      this.write(` error`);
    }
    this.write(`\n`);
    super.triggerOperation(context);
  }

  override visitAllOperationsAfter(context: Context): void {
    if (context.config.handlerPreamble == true) {
      this.write(`}\n\n`);
    }
    super.triggerAllOperationsAfter(context);
  }
}

export class RegisterVisitor extends GoVisitor {
  override visitInterfaceBefore(context: Context): void {
    if (!isService(context)) {
      return;
    }
    super.triggerInterfaceBefore(context);
    this.write(
      `func Register${context.interface.name}(svc ${context.interface.name}) {\n`,
    );
  }

  override visitOperation(context: Context): void {
    if (!isService(context)) {
      return;
    }
    const { namespace: ns, interface: iface, operation } = context;
    const $ = getImporter(context, IMPORTS);
    this.write(
      `${$.wapc}.RegisterFunction("${ns.name}.${iface.name}/${operation.name}", ${
        uncapitalize(iface.name)
      }${
        capitalize(
          operation.name,
        )
      }Wrapper(svc))\n`,
    );
    super.triggerOperation(context);
  }

  override visitInterfaceAfter(context: Context): void {
    if (!isService(context)) {
      return;
    }
    this.write(`}\n\n`);
    super.triggerInterfaceAfter(context);
  }
}
