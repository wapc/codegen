import {
  BaseVisitor,
  Context,
  Operation,
  Type,
  TypeResolver,
  Writer,
} from "../../deps/@apexlang/core/model/mod.ts";
import { HandlersVisitor } from "./handlers_visitor.ts";
import { HostVisitor } from "./host-visitor.ts";
import { WrapperFuncsVisitor, WrapperVarsVisitor } from "./wrappers_visitor.ts";
import {
  utils as rustUtils,
  visitors,
} from "../../deps/@apexlang/codegen/rust/mod.ts";
import * as ast from "../../deps/@apexlang/core/ast/mod.ts";

export class IntegrationVisitor extends BaseVisitor {
  constructor(writer: Writer) {
    super(writer);
    this.setCallback(
      "AllOperationsBefore",
      "host",
      (context: Context): void => {
        const host = new HostVisitor(writer);
        context.accept(context, host);
      },
    );
    this.setCallback(
      "AllOperationsBefore",
      "handlers",
      (context: Context): void => {
        const handlers = new HandlersVisitor(this.writer);
        context.accept(context, handlers);
      },
    );
    this.setCallback(
      "AllOperationsBefore",
      "wrappers",
      (context: Context): void => {
        const wrapperVars = new WrapperVarsVisitor(this.writer);
        context.accept(context, wrapperVars);
        const wrapperFuncs = new WrapperFuncsVisitor(this.writer);
        context.accept(context, wrapperFuncs);
      },
    );
    this.setCallback(
      "OperationAfter",
      "arguments",
      (context: Context): void => {
        const operation = context.operation!;
        if (operation.parameters.length == 0 || operation.isUnary()) {
          return;
        }
        const type = this.convertOperationToType(
          context.getType.bind(this),
          operation,
        );
        const struct = new visitors.StructVisitor(type, context);
        this.write(struct.toString());
      },
    );
    this.setCallback("Type", "struct", (context: Context): void => {
      const struct = new visitors.StructVisitor(context.type, context);
      this.write(struct.toString());
    });
  }

  override visitContextBefore(context: Context): void {
    this.write(`
#[cfg(feature = "guest")]
use wapc_guest::prelude::*;\n\n`);
    super.triggerContextBefore(context);
  }

  override visitContextAfter(context: Context): void {
    super.triggerContextAfter(context);
  }

  private convertOperationToType(tr: TypeResolver, operation: Operation): Type {
    const fields = operation.parameters.map((param) => {
      return new ast.FieldDefinition(
        undefined,
        param.node.name,
        param.node.description,
        param.node.type,
        param.node.default,
        param.node.annotations,
      );
    });
    return new Type(
      tr,
      new ast.TypeDefinition(
        operation.node.loc,
        new ast.Name(
          operation.node.name.loc,
          rustUtils.rustifyCaps(operation.name) + "Args",
        ),
        undefined,
        [],
        operation.annotations.map((a) => a.node),
        fields,
      ),
    );
  }
}
