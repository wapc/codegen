import {
  capitalize,
  formatComment,
  isHandler,
  isVoid,
} from "@apexlang/codegen/utils";
import { Context, BaseVisitor } from "@apexlang/core/model";
import { expandType, mapArgs, mapArg } from "./helpers";

export class HandlersVisitor extends BaseVisitor {
  visitOperation(context: Context): void {
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
    opVal += `register("${ns.name}.${iface.name}/${operation.name}", ${operation.name}Wrapper);\n}\n`;
    this.write(opVal);
    super.triggerOperation(context);
  }

  visitAllOperationsAfter(context: Context): void {
    if (context.config.handlerPreamble == true) {
      this.write(`}\n\n`);
      delete context.config.handlerPreamble;
    }
    super.triggerAllOperationsAfter(context);
  }
}
