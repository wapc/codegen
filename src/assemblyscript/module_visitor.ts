import { Context, Writer } from "@apexlang/core/model";
import { ClassVisitor } from "./class_visitor";
import { HostVisitor } from "./host_visitor";
import { HandlersVisitor } from "./handlers_visitor";
import { WrappersVisitor } from "./wrappers_visitor";
import { BuilderVisitor } from "./builder_visitor";
import { convertOperationToType } from "@apexlang/codegen/utils";

export class ModuleVisitor extends ClassVisitor {
  constructor(writer: Writer) {
    super(writer);
    this.setCallback(
      "AllOperationsBefore",
      "host",
      (context: Context): void => {
        const host = new HostVisitor(writer);
        context.namespace.accept(context, host);
      }
    );
    this.setCallback(
      "AllOperationsBefore",
      "handlers",
      (context: Context): void => {
        const handlers = new HandlersVisitor(this.writer);
        context.namespace.accept(context, handlers);
      }
    );
    this.setCallback(
      "AllOperationsBefore",
      "wrappers",
      (context: Context): void => {
        const wrappers = new WrappersVisitor(this.writer);
        context.namespace.accept(context, wrappers);
      }
    );
  }

  visitNamespaceBefore(context: Context): void {
    this.write(
      `import { Decoder, Writer, Encoder, Sizer, Codec } from "@wapc/as-msgpack";\n\n`
    );
    super.triggerNamespaceBefore(context);
  }

  visitInterface(context: Context): void {
    this.write(`\n`);
    super.triggerInterface(context);
  }

  visitOperation(context: Context): void {
    const { operation } = context;
    if (operation.parameters.length == 0 || operation.isUnary()) {
      return;
    }
    const tr = context.getType.bind(context);
    const argObject = convertOperationToType(tr, operation);
    const args = new ClassVisitor(this.writer);
    argObject.accept(context.clone({ type: argObject }), args);
    super.triggerOperation(context);
  }

  visitTypeFieldsAfter(context: Context): void {
    var { type } = context;
    super.visitTypeFieldsAfter(context);
    this.write(`\n`);
    this.write(`  static newBuilder(): ${type.name}Builder {
      return new ${type.name}Builder();
    }\n`);
    super.triggerTypeFieldsAfter(context);
  }

  visitTypeAfter(context: Context): void {
    this.write(`}\n\n`);

    const builder = new BuilderVisitor(this.writer);
    context.type.accept(context, builder);
    super.triggerTypeAfter(context);
  }
}
