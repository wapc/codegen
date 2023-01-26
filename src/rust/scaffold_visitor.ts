import { BaseVisitor, Context, Writer } from "../deps/core/model.ts";
import { shouldIncludeHandler } from "./utils/mod.ts";
import { functionName, mapArgs } from "./helpers.ts";
import * as utils from "../deps/codegen/utils.ts";
import { utils as rustUtils } from "../deps/codegen/rust.ts";

export class ScaffoldVisitor extends BaseVisitor {
  constructor(writer: Writer) {
    super(writer);
  }

  visitContextBefore(context: Context): void {
    const useName = context.config["use"] || "generated";
    super.visitContextBefore(context);
    this.write(`mod ${useName};
use wapc_guest::prelude::*;
pub use ${useName}::*;\n\n`);
  }

  visitAllOperationsBefore(context: Context): void {
    const registration = new HandlerRegistrationVisitor(this.writer);
    context.accept(context, registration);
  }

  visitOperation(context: Context): void {
    if (!shouldIncludeHandler(context)) {
      return;
    }
    const operation = context.operation!;
    this.write(`\n`);
    this.write(
      `fn ${functionName(operation.name)}(${
        mapArgs(
          operation.parameters,
          context.config,
          true,
        )
      }) -> HandlerResult<`,
    );
    if (!utils.isVoid(operation.type)) {
      this.write(
        rustUtils.types.apexToRustType(operation.type, context.config),
      );
    } else {
      this.write(`()`);
    }
    this.write(`> {\n`);
    if (!utils.isVoid(operation.type)) {
      const dv = rustUtils.types.defaultValue(operation.type, context.config);
      this.write(`    Ok(${dv})`);
    } else {
      this.write(`    Ok(())`);
    }
    this.write(` // TODO: Provide implementation.\n`);
    this.write(`}\n`);
  }
}

class HandlerRegistrationVisitor extends BaseVisitor {
  constructor(writer: Writer) {
    super(writer);
  }

  visitAllOperationsBefore(_context: Context): void {
    this.write(`#[no_mangle]
pub fn wapc_init() {\n`);
  }

  visitOperation(context: Context): void {
    if (!shouldIncludeHandler(context)) {
      return;
    }
    const operation = context.operation!;
    this.write(
      `    Handlers::register_${functionName(operation.name)}(${
        functionName(
          operation.name,
        )
      });\n`,
    );
  }

  visitAllOperationsAfter(_context: Context): void {
    this.write(`}\n`);
  }
}
