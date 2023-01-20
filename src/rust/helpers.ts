// deno-lint-ignore-file no-explicit-any
import { ObjectMap, Parameter } from "../deps/core/model.ts";
import { snakeCase } from "./utils/mod.ts";
import { utils as rustUtils } from "../deps/codegen/rust.ts";

export function functionName(str: string): string {
  return rustUtils.rustify(str);
}

export function fieldName(str: string): string {
  return rustUtils.rustify(str);
}

/**
 * Returns string of args mapped to their type
 */
export function mapArgs(
  args: Parameter[],
  config: ObjectMap<any>,
  template = false,
): string {
  return args
    .map((arg) => {
      return mapArg(arg, config, template);
    })
    .join(", ");
}

export function mapArg(
  arg: Parameter,
  config: ObjectMap<any>,
  template = false,
): string {
  return (
    (template ? "_" : "") +
    `${arg.name}: ${rustUtils.types.apexToRustType(arg.type, config)}`
  );
}

export function varAccessArg(variable: string, args: Parameter[]): string {
  return args
    .map((arg) => {
      return `${variable}.${snakeCase(arg.name)}`;
    })
    .join(", ");
}
