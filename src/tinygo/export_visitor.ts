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

import { BaseVisitor, Context, Writer } from "@apexlang/core/model";
import { Import } from "@apexlang/codegen/go";
import { HostVisitor } from "./host_visitor.js";
import { RegisterVisitor } from "./handlers_visitor.js";
import { WrapperFuncsVisitor } from "./wrappers_visitor.js";

export class ExportVisitor extends BaseVisitor {
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
        const register = new RegisterVisitor(this.writer);
        context.namespace.accept(context, register);
      }
    );
    this.setCallback(
      "AllOperationsBefore",
      "wrappers",
      (context: Context): void => {
        const wrapperFuncs = new WrapperFuncsVisitor(this.writer);
        context.namespace.accept(context, wrapperFuncs);
      }
    );
  }

  visitNamespaceBefore(context: Context): void {
    const packageName = context.config["package"] || "module";
    this.write(`// Code generated by @apexlang/codegen. DO NOT EDIT.

    package ${packageName}

    import (
      "context"

      "github.com/wapc/tinygo-msgpack"
      "github.com/wapc/tinygo-msgpack/convert"
      "github.com/wapc/wapc-guest-tinygo"\n`);
    const aliases = (context.config.aliases as { [key: string]: Import }) || {};
    for (let a of Object.values(aliases)) {
      if (a.import) {
        this.write(`\t"${a.import}"\n`);
      }
    }
    this.write(`)
    
    var _ = convert.Package\n\n`);
    super.triggerNamespaceBefore(context);
  }
}
