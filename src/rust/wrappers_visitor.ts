import { BaseVisitor, Context, Writer } from "../deps/core/model.ts";
import { functionName, varAccessArg } from "./helpers.ts";
import { shouldIncludeHandler } from "./utils/mod.ts";
import * as utils from "../deps/codegen/utils.ts";
import { utils as rustUtils } from "../deps/codegen/rust.ts";

export class WrapperVarsVisitor extends BaseVisitor {
  constructor(writer: Writer) {
    super(writer);
  }

  visitOperation(context: Context): void {
    if (!shouldIncludeHandler(context)) {
      return;
    }
    const operation = context.operation!;
    const fnName = functionName(operation.name).toUpperCase();
    const paramTypes = operation.parameters
      .map((param) =>
        rustUtils.types.apexToRustType(param.type, context.config)
      )
      .join(",");
    const returnType = utils.isVoid(operation.type)
      ? "()"
      : rustUtils.types.apexToRustType(operation.type, context.config);

    this.write(`
#[cfg(feature = "guest")]
static ${fnName}: once_cell::sync::Lazy<std::sync::RwLock<Option<fn(${paramTypes}) -> HandlerResult<${returnType}>>>> =
  once_cell::sync::Lazy::new(|| std::sync::RwLock::new(None));
`);
  }

  visitAllOperationsAfter(context: Context): void {
    if (context.config.handlerPreamble == true) {
      this.write(`}\n\n`);
    }
    super.triggerAllOperationsAfter(context);
  }
}

export class WrapperFuncsVisitor extends BaseVisitor {
  constructor(writer: Writer) {
    super(writer);
  }

  visitOperation(context: Context): void {
    if (!shouldIncludeHandler(context)) {
      return;
    }
    const operation = context.operation!;
    const fnName = functionName(operation.name);
    let inputType = "",
      inputArgs = "";
    if (operation.isUnary()) {
      inputType = rustUtils.types.apexToRustType(
        operation.unaryOp().type,
        context.config,
      );
      inputArgs = "input";
    } else {
      inputType = `${rustUtils.rustifyCaps(operation.name)}Args`;
      inputArgs = varAccessArg("input", operation.parameters);
    }

    this.write(`
#[cfg(feature = "guest")]
fn ${fnName}_wrapper(input_payload: &[u8]) -> CallResult {
  let input = wapc_codec::messagepack::deserialize::<${inputType}>(input_payload)?;
  let lock = ${fnName.toUpperCase()}.read().unwrap().unwrap();
  let result = lock(${inputArgs})?;
  Ok(wapc_codec::messagepack::serialize(result)?)
}`);
  }

  visitWrapperBeforeReturn(context: Context): void {
    this.triggerCallbacks(context, "WrapperBeforeReturn");
  }
}
