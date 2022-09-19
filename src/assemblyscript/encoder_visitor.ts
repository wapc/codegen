import { Context, BaseVisitor } from "@apexlang/core/model";
import { encode, strQuote } from "./helpers";

export class EncoderVisitor extends BaseVisitor {
  visitTypeFieldsBefore(context: Context): void {
    super.triggerTypeFieldsBefore(context);
    this.write(
      `  encode(encoder: Writer): void {
    encoder.writeMapSize(${context.fields.length});\n`
    );
  }

  visitTypeField(context: Context): void {
    const { field } = context;
    this.write(`encoder.writeString(${strQuote(field.name)});\n`);
    this.write(encode("this." + field.name, field.type));
    super.triggerTypeField(context);
  }

  visitTypeFieldsAfter(context: Context): void {
    this.write(`  }\n`);
    super.triggerTypeFieldsAfter(context);
  }
}
