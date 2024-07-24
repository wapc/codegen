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

import { capitalize } from "../../deps/@apexlang/codegen/utils/mod.ts";
import {
  Alias,
  AnyType,
  Context,
  Field,
  Kind,
  List,
  Map,
  Named,
  Operation,
  Optional,
  Parameter,
  Primitive,
} from "../../deps/@apexlang/core/model/mod.ts";
import {
  decodeFuncs,
  encodeFuncs,
  primitives,
  translations,
} from "./constant.ts";

/**
 * Creates string that is an msgpack size code block
 * @param variable variable that is being size
 * @param t the type node to encode
 */
export function size(variable: string, t: AnyType): string {
  return write("sizer", "Writer", "encode", variable, t, false);
}

/**
 * Creates string that is an msgpack encode code block
 * @param variable variable that is being encode
 * @param t the type node to encode
 */
export function encode(variable: string, t: AnyType): string {
  return write("encoder", "Writer", "encode", variable, t, false);
}

/**
 * Return default value for a Field. Default value of objects are instantiated.
 * @param fieldDef Field Node to get default value of
 */
export function defValue(_context: Context, fieldDef: Field): string {
  let type = fieldDef.type;
  if (fieldDef.default) {
    let returnVal = fieldDef.default.getValue();
    if (fieldDef.type.kind == Kind.Primitive) {
      let typeName = (fieldDef.type as Primitive).name as string;
      typeName = translations.get(typeName) || typeName;
      returnVal = typeName == "string" ? strQuote(returnVal) : returnVal;
    }
    return returnVal;
  }

  if (type.kind == Kind.Alias) {
    const a = type as Alias;
    type = a.type;
  }

  switch (type.kind) {
    case Kind.Optional:
      return "null";
    case Kind.List:
    case Kind.Map:
      return `new ${expandType(type, false)}()`;
    case Kind.Primitive:
    case Kind.Alias:
    case Kind.Enum:
    case Kind.Type:
    case Kind.Union: {
      const typeName = (fieldDef.type as Named).name;
      switch (typeName) {
        case "ID":
        case "string":
          return `''`;
        case "bool":
          return "false";
        case "i8":
        case "u8":
        case "i16":
        case "u16":
        case "i32":
        case "u32":
        case "i64":
        case "u64":
        case "f32":
        case "f64":
          return "0";
        case "bytes":
          return "new ArrayBuffer(0)";
        case "datetime":
          return "new Date()";
        default:
          // const def = defaultForAlias(context)(typeName);
          // if (def) {
          //   return def;
          // }
          return `new ${capitalize(typeName)}()`; // reference to something else
      }
    }
  }
  return `???${expandType(type, false)}???`;
}

export function defaultValueForType(type: AnyType): string {
  if (type.kind == Kind.Alias) {
    const a = type as Alias;
    type = a.type;
  }
  switch (type.kind) {
    case Kind.Optional:
      return "null";
    case Kind.List:
    case Kind.Map:
      return `new ${expandType(type, false)}()`;
    case Kind.Primitive:
    case Kind.Alias:
    case Kind.Enum:
    case Kind.Type:
    case Kind.Union: {
      const name = (type as Named).name;
      switch (name) {
        case "ID":
        case "string":
          return `''`;
        case "bool":
          return "false";
        case "i8":
        case "u8":
        case "i16":
        case "u16":
        case "i32":
        case "u32":
        case "i64":
        case "u64":
        case "f32":
        case "f64":
          return "0";
        case "bytes":
          return "new ArrayBuffer(0)";
        default:
          return `new ${capitalize(name)}()`; // reference to something else
      }
    }
  }
  return "???";
}

/**
 * returns string in quotes
 * @param s string to have quotes
 */
export function strQuote(s: string): string {
  return `\"${s}\"`;
}

/**
 * returns string of the expanded type of a node
 * @param type the type node that is being expanded
 * @param useOptional if the type that is being expanded is optional
 */
export const expandType = (type: AnyType, useOptional: boolean): string => {
  switch (type.kind) {
    case Kind.Primitive:
    case Kind.Alias:
    case Kind.Enum:
    case Kind.Type:
    case Kind.Union: {
      const namedValue = (type as Named).name;
      const translation = translations.get(namedValue);
      if (translation != undefined) {
        return translation!;
      }
      return namedValue;
    }
    case Kind.Map:
      return `Map<${expandType((type as Map).keyType, true)},${
        expandType(
          (type as Map).valueType,
          true,
        )
      }>`;
    case Kind.List:
      return `Array<${expandType((type as List).type, true)}>`;
    case Kind.Optional: {
      const expanded = expandType((type as Optional).type, true);
      if (useOptional) {
        return `${expanded} | null`;
      }
      return expanded;
    }
    default:
      return "unknown";
  }
};

/**
 * Creates string that is an msgpack read code block
 * @param variable variable that is being read
 * @param t the type node to write
 * @param prevOptional if type is being expanded and the parent type is optional
 */
export function read(
  variable: string,
  t: AnyType,
  prevOptional: boolean,
): string {
  let prefix = "return ";
  if (variable != "") {
    prefix = variable + " = ";
  }
  if (t.kind == Kind.Alias) {
    const a = t as Alias;
    t = a.type;
  }
  switch (t.kind) {
    case Kind.Primitive:
    case Kind.Alias:
    case Kind.Enum:
    case Kind.Type:
    case Kind.Union: {
      const namedNode = t as Named;
      if (decodeFuncs.has(namedNode.name)) {
        if (prevOptional) {
          if (primitives.has(namedNode.name)) {
            return `${prefix}decoder.${decodeFuncs.get(namedNode.name)}();\n`;
          }
        }
        return `${prefix}decoder.${decodeFuncs.get(namedNode.name)}();\n`;
      }
      return `${prefix}${namedNode.name}.decode(decoder);`;
    }
    case Kind.Map: {
      let code = `${prefix}decoder.read`;
      if (prevOptional) {
        code += "Nullable";
      }
      code += "Map(\n";
      code += `(decoder: Decoder): ${
        expandType(
          (t as Map).keyType,
          true,
        )
      } => {\n`;
      code += read("", (t as Map).keyType, false);
      code += "},\n";
      code += `(decoder: Decoder): ${
        expandType(
          (t as Map).valueType,
          true,
        )
      } => {\n`;
      code += read("", (t as Map).valueType, false);
      code += "});\n";
      return code;
    }
    case Kind.List: {
      let listCode = "";
      listCode += `${prefix}decoder.read`;
      if (prevOptional) {
        listCode += "Nullable";
      }
      listCode += `Array((decoder: Decoder): ${
        expandType(
          (t as List).type,
          true,
        )
      } => {\n`;
      listCode += read("", (t as List).type, false);
      listCode += "});\n";
      return listCode;
    }
    case Kind.Optional: {
      const optNode = t as Optional;
      optNode.type;
      switch (optNode.type.kind) {
        case Kind.List:
        case Kind.Map:
          return prefix + read(variable, optNode.type, true);
      }
      let optCode = "";
      optCode += "if (decoder.isNextNil()) {\n";
      optCode += prefix + "null;\n";
      optCode += "} else {\n";
      optCode += read(variable, optNode.type, true);
      optCode += "}\n";
      return optCode;
    }
    default:
      return "unknown";
  }
}

/**
 * Creates string that is an msgpack write code block
 * @param typeInst name of variable which object that is writting is assigning to
 * @param typeClass class that is being written
 * @param typeMeth method that is being called
 * @param variable variable that is being written
 * @param t the type node to write
 * @param prevOptional if type is being expanded and the parent type is optional
 */
export function write(
  typeInst: string,
  typeClass: string,
  typeMeth: string,
  variable: string,
  t: AnyType,
  prevOptional: boolean,
): string {
  let code = "";
  if (t.kind == Kind.Alias) {
    const a = t as Alias;
    t = a.type;
  }
  switch (t.kind) {
    case Kind.Primitive:
    case Kind.Alias:
    case Kind.Enum:
    case Kind.Type:
    case Kind.Union: {
      const namedNode = t as Named;
      if (encodeFuncs.has(namedNode.name)) {
        return `${typeInst}.${encodeFuncs.get(namedNode.name)}(${variable});\n`;
      }
      return `${variable}.${typeMeth}(${typeInst});\n`;
    }
    case Kind.Map: {
      const mappedNode = t as Map;
      code += typeInst + ".write";
      if (prevOptional) {
        code += "Nullable";
      }
      code += "Map(" + variable + ",\n";
      code += "(" +
        typeInst +
        ": " +
        typeClass +
        ", key: " +
        expandType(mappedNode.keyType, true) +
        " ): void => {\n";
      code += write(
        typeInst,
        typeClass,
        typeMeth,
        "key",
        mappedNode.keyType,
        false,
      );
      code += "},\n";
      code += "(" +
        typeInst +
        ": " +
        typeClass +
        ", value: " +
        expandType(mappedNode.valueType, true) +
        " ): void => {\n";
      code += write(
        typeInst,
        typeClass,
        typeMeth,
        "value",
        mappedNode.valueType,
        false,
      );
      code += "});\n";
      return code;
    }
    case Kind.List: {
      const listNode = t as List;
      code += typeInst + ".write";
      if (prevOptional) {
        code += "Nullable";
      }
      code += "Array(" +
        variable +
        ", (" +
        typeInst +
        ": " +
        typeClass +
        ", item: " +
        expandType(listNode.type, true) +
        " ): void => {\n";
      code += write(
        typeInst,
        typeClass,
        typeMeth,
        "item",
        listNode.type,
        false,
      );
      code += "});\n";
      return code;
    }
    case Kind.Optional: {
      const optionalNode = t as Optional;
      switch (optionalNode.kind) {
        case Kind.List:
        case Kind.Map:
          return write(
            typeInst,
            typeClass,
            typeMeth,
            variable,
            optionalNode.type,
            true,
          );
      }
      code += "if (" + variable + " === null) {\n";
      code += typeInst + ".writeNil()\n";
      code += "} else {\n";
      code += write(
        typeInst,
        typeClass,
        typeMeth,
        variable + "!",
        optionalNode.type,
        true,
      );
      code += "}\n";
      return code;
    }
    default:
      return "unknown";
  }
}

/**
 * Given an array of Operation returns them as functions with their arguments
 * @param ops
 */
export function opsAsFns(ops: Operation[]): string {
  return ops
    .map((op) => {
      return `function ${op.name}(${mapArgs(op.parameters)}): ${
        expandType(
          op.type,
          true,
        )
      } {\n}`;
    })
    .join("\n");
}

/**
 * returns string of args mapped to their type
 * @param args Parameter array which is an array of the arguments
 */
export function mapArgs(params: Parameter[]): string {
  return params
    .map((param) => {
      return mapArg(param);
    })
    .join(", ");
}

export function mapArg(param: Parameter): string {
  return `${param.name}: ${expandType(param.type, true)}`;
}

export function varAccessArg(variable: string, params: Parameter[]): string {
  return params
    .map((param) => {
      return `${variable}.${param.name}`;
    })
    .join(", ");
}
