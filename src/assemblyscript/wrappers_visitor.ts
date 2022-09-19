import { Context, BaseVisitor } from "@apexlang/core/model";
import {
  capitalize,
  isHandler,
  isObject,
  isVoid,
} from "@apexlang/codegen/utils";
import {
  expandType,
  size,
  encode,
  mapArgs,
  varAccessArg,
  read,
} from "./helpers";

export class WrappersVisitor extends BaseVisitor {
  visitOperation(context: Context): void {
    if (!isHandler(context)) {
      return;
    }
    const { operation } = context;
    this.write(
      `var ${operation.name}Handler: (${mapArgs(operation.parameters)}) => `
    );
    if (isVoid(operation.type)) {
      this.write(`Error | null;\n`);
    } else {
      this.write(`Result<${expandType(operation.type, true)}>;\n`);
    }
    this
      .write(`function ${operation.name}Wrapper(payload: ArrayBuffer): Result<ArrayBuffer> {
      const decoder = new Decoder(payload)\n`);
    if (operation.isUnary()) {
      const unaryParam = operation.parameters[0];
      if (isObject(unaryParam.type)) {
        this.write(`const request = new ${expandType(
          operation.unaryOp().type,
          false
        )}();
      request.decode(decoder);\n`);
        this.write(isVoid(operation.type) ? "" : "const result = ");
        this.write(`${operation.name}Handler(request);\n`);
      } else {
        this.write(`const ${read("val", unaryParam.type, false)}`);
        this.write(isVoid(operation.type) ? "" : "const result = ");
        this.write(`${operation.name}Handler(val);\n`);
      }
    } else {
      if (operation.parameters.length > 0) {
        this.write(`const inputArgs = new ${capitalize(operation.name)}Args();
        inputArgs.decode(decoder);
        if (decoder.error()) {
          return Result.error<ArrayBuffer>(decoder.error()!)
        }\n`);
      }
      this.write(
        `const result = ${operation.name}Handler(${varAccessArg(
          "inputArgs",
          operation.parameters
        )});\n`
      );
      if (isVoid(operation.type)) {
        this.write(`if (result) {
            return Result.error<ArrayBuffer>(result);
          }\n`);
      } else {
        this.write(`if (!result.isOk) {
            return Result.error<ArrayBuffer>(result.error()!);
          }\n`);
      }
    }
    if (!isVoid(operation.type)) {
      this.write(`const response = result.get();\n`);
    }
    if (isVoid(operation.type)) {
      this.visitWrapperBeforeReturn(context);
      this.write(`return Result.ok(new ArrayBuffer(0));\n`);
    } else if (isObject(operation.type)) {
      this.visitWrapperBeforeReturn(context);
      this.write(`return Result.ok(response.toBuffer());\n`);
    } else {
      this.write(`const sizer = new Sizer();\n`);
      this.write(size("response", operation.type));
      this.write(`const ua = new ArrayBuffer(sizer.length);
      const encoder = new Encoder(ua);
      ${encode("response", operation.type)};\n`);
      this.visitWrapperBeforeReturn(context);
      this.write(`return Result.ok(ua);\n`);
    }
    this.write(`}\n\n`);
  }

  visitWrapperBeforeReturn(context: Context): void {
    this.triggerCallbacks(context, "WrapperBeforeReturn");
  }
}
