import {
  BaseVisitor,
  Context,
  Writer,
} from "../../deps/@apexlang/core/model/mod.ts";
import { functionName } from "./helpers.ts";
import { formatComment } from "./utils/mod.ts";
import * as utils from "../../deps/@apexlang/codegen/utils/mod.ts";
import { utils as rustUtils } from "../../deps/@apexlang/codegen/rust/mod.ts";
import { isService } from "../../deps/@apexlang/codegen/utils/mod.ts";

export class HandlersVisitor extends BaseVisitor {
  constructor(writer: Writer) {
    super(writer);
  }

  override visitOperation(context: Context): void {
    if (!isService(context)) {
      return;
    }
    if (context.config.handlerPreamble != true) {
      const className = context.config.handlersClassName || "Handlers";
      this.write(`
#[cfg(feature = "guest")]
pub struct ${className} {}

#[cfg(feature = "guest")]
impl ${className} {
`);
      context.config.handlerPreamble = true;
    }
    const { namespace, operation, interface: iface } = context;
    this.write(formatComment("    /// ", operation.description));
    const opName = namespace.name + "." + iface.name + "/" + operation.name;
    const fnName = functionName(operation.name);
    const paramTypes = operation.parameters
      .map((param) =>
        rustUtils.types.apexToRustType(param.type, context.config)
      )
      .join(",");
    const returnType = utils.isVoid(operation)
      ? "()"
      : rustUtils.types.apexToRustType(operation.type, context.config);

    this.write(`
pub fn register_${fnName}(f: fn(${paramTypes}) -> HandlerResult<${returnType}>) {
  *${fnName.toUpperCase()}.write().unwrap() = Some(f);
  register_function("${opName}", ${fnName}_wrapper);
}`);
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
