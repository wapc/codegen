/*
Copyright 2025 The waPC Authors.

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

import { Context, Writer } from "../../deps/@apexlang/core/model/mod.ts";
import { GoVisitor } from "../../deps/@apexlang/codegen/go/mod.ts";
import { HostVisitor } from "./host_visitor.ts";
import { RegisterVisitor } from "./handlers_visitor.ts";
import { WrapperFuncsVisitor } from "./wrappers_visitor.ts";

export class ExportVisitor extends GoVisitor {
  constructor(writer: Writer) {
    super(writer);
    this.setCallback(
      "AllOperationsBefore",
      "host",
      (context: Context): void => {
        const host = new HostVisitor(writer);
        context.namespace.accept(context, host);
      },
    );
    this.setCallback(
      "AllOperationsBefore",
      "handlers",
      (context: Context): void => {
        const register = new RegisterVisitor(this.writer);
        context.namespace.accept(context, register);
      },
    );
    this.setCallback(
      "AllOperationsBefore",
      "wrappers",
      (context: Context): void => {
        const wrapperFuncs = new WrapperFuncsVisitor(this.writer);
        context.namespace.accept(context, wrapperFuncs);
      },
    );
  }
}
