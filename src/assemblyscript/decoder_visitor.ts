import { Context, BaseVisitor } from "@apexlang/core/model";
import { read } from "./helpers";

export class DecoderVisitor extends BaseVisitor {
  visitTypeFieldsBefore(context: Context): void {
    const { type } = context;
    super.triggerTypeFieldsBefore(context);
    this.write(
      `    static decodeNullable(decoder: Decoder): ${type.name} | null {
    if (decoder.isNextNil()) return null;
    return ${type.name}.decode(decoder);
  }

  // decode
  static decode(decoder: Decoder): ${type.name} {
    const o = new ${type.name}();
    o.decode(decoder);
    return o;
  }
    
  decode(decoder: Decoder): void {
    var numFields = decoder.readMapSize();

    while (numFields > 0) {
      numFields--;
      const field = decoder.readString();\n\n`
    );
  }

  visitTypeField(context: Context): void {
    const { field, fieldIndex } = context;
    this.write(`      `);
    if (fieldIndex > 0) {
      this.write(`} else `);
    }
    this.write(`if (field == "${field.name}") {\n`);
    this.write(read(`this.${field.name}`, field.type, false));
    super.triggerTypeField(context);
  }

  visitTypeFieldsAfter(context: Context): void {
    if (context.fields.length > 0) {
      this.write(`      } else {
        decoder.skip();
      }\n`);
    }
    this.write(`    }\n`);
    this.write(`  }\n`);
    super.triggerTypeFieldsAfter(context);
  }
}
