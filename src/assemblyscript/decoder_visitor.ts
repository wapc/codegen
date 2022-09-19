/*
Copyright 2022 The waPC Authors.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

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
