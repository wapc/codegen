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
  BaseVisitor,
  Context,
  Kind,
} from "../../deps/@apexlang/core/model/mod.ts";
import {
  expandType,
  getImporter,
  Import,
  mapParams,
  msgpackEncode,
  msgpackRead,
  msgpackSize,
  msgpackVarAccessParam,
  returnShare,
  translateAlias,
} from "../../deps/@apexlang/codegen/go/mod.ts";
import {
  capitalize,
  isObject,
  isService,
  isVoid,
  operationArgsType,
  uncapitalize,
} from "../../deps/@apexlang/codegen/utils/mod.ts";
import { IMPORTS } from "./constants.ts";

export class WrapperVarsVisitor extends BaseVisitor {
  override visitOperation(context: Context): void {
    if (!isService(context)) {
      return;
    }
    const tr = translateAlias(context);
    if (context.config.handlerPreamble != true) {
      this.write(`var (\n`);
      context.config.handlerPreamble = true;
    }
    const operation = context.operation!;
    this.write(
      `\t${uncapitalize(operation.name)}Handler func (${
        mapParams(
          context,
          operation.parameters,
        )
      }) `,
    );
    if (!isVoid(operation.type)) {
      this.write(`(${expandType(operation.type, undefined, true, tr)}, error)`);
    } else {
      this.write(`error`);
    }
    this.write(`\n`);
  }

  override visitAllOperationsAfter(context: Context): void {
    if (context.config.handlerPreamble == true) {
      this.write(`)\n\n`);
      delete context.config.handlerPreamble;
    }
    super.triggerAllOperationsAfter(context);
  }
}

export class WrapperFuncsVisitor extends BaseVisitor {
  private aliases: { [key: string]: Import } = {};

  override visitContextBefore(context: Context): void {
    this.aliases = (context.config.aliases as { [key: string]: Import }) || {};
  }

  override visitOperation(context: Context): void {
    if (!isService(context)) {
      return;
    }
    const tr = translateAlias(context);
    const { interface: iface, operation } = context;
    const $ = getImporter(context, IMPORTS);
    this.write(
      `func ${uncapitalize(iface.name)}${
        capitalize(
          operation.name,
        )
      }Wrapper(svc ${iface.name}) ${$.wapc}.Function {
        return func(payload []byte) ([]byte, error) {
          ctx := ${$.context}.Background()\n`,
    );
    if (operation.parameters.length > 0) {
      this.write(`decoder := ${$.msgpack}.NewDecoder(payload)\n`);
    }
    if (operation.isUnary()) {
      const unaryParam = operation.parameters[0];
      if (unaryParam.type.kind == Kind.Enum) {
        this.write(`enumVal, err := decoder.ReadInt32()
        if err != nil {
          return nil, err
        }
        request := ${
          expandType(
            operation.unaryOp().type,
            undefined,
            false,
            tr,
          )
        }(enumVal)\n`);
      } else if (isObject(unaryParam.type)) {
        this.write(`var request ${
          expandType(
            operation.unaryOp().type,
            undefined,
            false,
            tr,
          )
        }
        if err := request.Decode(&decoder); err != nil {
          return nil, err
        }\n`);
      } else {
        this.write(
          `${
            msgpackRead(
              context,
              false,
              "request",
              true,
              "",
              unaryParam.type,
              false,
            )
          }`,
        );
        this.write(`if err != nil {
          return nil, err
        }\n`);
      }
      this.write(isVoid(operation.type) ? "err := " : "response, err := ");
      this.write(
        `svc.${capitalize(operation.name)}(ctx, ${
          returnShare(
            unaryParam.type,
          )
        }request)\n`,
      );
    } else {
      if (operation.parameters.length > 0) {
        this.write(`var inputArgs ${operationArgsType(iface, operation)}
        inputArgs.Decode(&decoder)\n`);
      }
      this.write(isVoid(operation.type) ? "err := " : "response, err := ");
      this.write(
        `svc.${capitalize(operation.name)}(${
          msgpackVarAccessParam(
            "inputArgs",
            operation.parameters,
          )
        })\n`,
      );
    }
    this.write(`if err != nil {
      return nil, err
    }\n`);
    if (isVoid(operation.type)) {
      this.visitWrapperBeforeReturn(context);
      this.write(`return []byte{}, nil\n`);
    } else if (operation.type.kind == Kind.Enum) {
      this.write(`var sizer ${$.msgpack}.Sizer
      sizer.WriteInt32(int32(response))
      ua := make([]byte, sizer.Len());
      encoder := ${$.msgpack}.NewEncoder(ua);
      encoder.WriteInt32(int32(response))\n`);
      this.visitWrapperBeforeReturn(context);
      this.write(`return ua, nil\n`);
    } else if (isObject(operation.type)) {
      this.visitWrapperBeforeReturn(context);
      this.write(`return ${$.msgpack}.ToBytes(response)\n`);
    } else {
      this.write(`var sizer ${$.msgpack}.Sizer
      ${msgpackSize(context, true, "response", operation.type)}`);
      this.write(`ua := make([]byte, sizer.Len());
      encoder := ${$.msgpack}.NewEncoder(ua);
      ${msgpackEncode(context, true, "response", operation.type)}`);
      this.visitWrapperBeforeReturn(context);
      this.write(`return ua, nil\n`);
    }
    this.write(`}
  }\n\n`);
  }

  visitWrapperBeforeReturn(context: Context): void {
    this.triggerCallbacks(context, "WrapperBeforeReturn");
  }
}
