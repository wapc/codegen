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
import { formatComment } from "@apexlang/codegen/utils";
import { expandType, defValue } from "./helpers";
import { DecoderVisitor } from "./decoder_visitor";
import { EncoderVisitor } from "./encoder_visitor";

export class ClassVisitor extends BaseVisitor {
  visitTypeBefore(context: Context): void {
    super.triggerTypeBefore(context);
    const { type } = context;
    this.write(formatComment("// ", type.description));
    this.write(`export class ${type.name} implements Codec {\n`);
  }

  visitTypeField(context: Context): void {
    const { field } = context;
    this.write(formatComment("  // ", field.description));
    this.write(
      `  ${field.name}: ${expandType(field.type, true)} = ${defValue(
        context,
        field
      )};\n`
    );
    super.triggerTypeField(context);
  }

  visitTypeFieldsAfter(context: Context): void {
    const { type } = context;
    this.write(`\n`);
    const decoder = new DecoderVisitor(this.writer);
    type.accept(context, decoder);
    this.write(`\n`);
    const encoder = new EncoderVisitor(this.writer);
    type.accept(context, encoder);
    this.write(`\n`);

    this.write(`  toBuffer(): ArrayBuffer {
      let sizer = new Sizer();
      this.encode(sizer);
      let buffer = new ArrayBuffer(sizer.length);
      let encoder = new Encoder(buffer);
      this.encode(encoder);
      return buffer;
    }\n`);
    super.triggerTypeFieldsAfter(context);
  }

  visitTypeAfter(context: Context): void {
    this.write(`}\n\n`);
    super.triggerTypeAfter(context);
  }
}
