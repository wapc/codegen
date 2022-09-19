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
