import { capitalize } from "@apexlang/codegen/utils";
import { Context, BaseVisitor } from "@apexlang/core/model";
import { expandType } from "./helpers";

export class BuilderVisitor extends BaseVisitor {
  visitTypeBefore(context: Context): void {
    super.triggerTypeBefore(context);
    const className = context.type.name;
    this.write(`export class ${className}Builder {
  instance: ${className} = new ${className}();\n`);
  }

  visitTypeField(context: Context): void {
    const className = context.type.name;
    const field = context.field!;
    this.write(`\n`);
    this.write(`with${capitalize(field.name)}(${field.name}: ${expandType(
      field.type!,
      true
    )}): ${className}Builder {
    this.instance.${field.name} = ${field.name};
    return this;
  }\n`);
    super.triggerTypeField(context);
  }

  visitTypeFieldsAfter(context: Context): void {
    this.write(`\n`);
    this.write(`  build(): ${context.type.name} {
      return this.instance;
    }`);
    super.triggerTypeFieldsAfter(context);
  }

  visitTypeAfter(context: Context): void {
    this.write(`}\n\n`);
    super.triggerTypeAfter(context);
  }
}
