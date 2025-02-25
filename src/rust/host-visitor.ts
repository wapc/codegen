import {
  BaseVisitor,
  Context,
  Writer,
} from "../../deps/@apexlang/core/model/mod.ts";
import { fieldName, functionName } from "./helpers.ts";
import { formatComment } from "./utils/mod.ts";
import * as utils from "../../deps/@apexlang/codegen/utils/mod.ts";
import { utils as rustUtils } from "../../deps/@apexlang/codegen/rust/mod.ts";
import { isProvider } from "../../deps/@apexlang/codegen/utils/mod.ts";

export class HostVisitor extends BaseVisitor {
  constructor(writer: Writer) {
    super(writer);
  }

  override visitOperation(context: Context): void {
    if (!isProvider(context)) {
      return;
    }
    if (context.config.hostPreamble != true) {
      const className = context.config.hostClassName || "Host";
      this.write(`
#[cfg(feature = "guest")]
pub struct ${className} {
    binding: String,
}

#[cfg(feature = "guest")]
impl Default for ${className} {
    fn default() -> Self {
      ${className} {
            binding: "default".to_string(),
        }
    }
}

/// Creates a named host binding
#[cfg(feature = "guest")]
pub fn host(binding: &str) -> ${className} {
  ${className} {
        binding: binding.to_string(),
    }
}

/// Creates the default host binding
#[cfg(feature = "guest")]
pub fn default() -> ${className} {
  ${className}::default()
}

#[cfg(feature = "guest")]
impl ${className} {`);
      context.config.hostPreamble = true;
    }
    const { namespace, operation, interface: iface } = context;
    this.write(formatComment("  /// ", operation.description));
    this.write(`pub fn ${functionName(operation.name)}(&self`);
    operation.parameters.map((param, _index) => {
      this.write(
        `, ${fieldName(param.name)}: ${
          rustUtils.types.apexToRustType(
            param.type,
            context.config,
          )
        }`,
      );
    });
    this.write(`) `);
    const retVoid = utils.isVoid(operation.type);
    if (!retVoid) {
      this.write(
        `-> HandlerResult<${
          rustUtils.types.apexToRustType(
            operation.type,
            context.config,
          )
        }>`,
      );
    } else {
      this.write(`-> HandlerResult<()>`);
    }
    this.write(` {\n`);

    if (operation.parameters.length == 0) {
      this.write(`
host_call(
  &self.binding,
  "${namespace.name}",
  "${iface.name}/${operation.name}",
  &vec![],
)
`);
    } else if (operation.isUnary()) {
      this.write(`
host_call(
  &self.binding,
  "${namespace.name}",
  "${iface.name}/${operation.name}",
  &wapc_codec::messagepack::serialize(${operation.unaryOp().name})?,
)
`);
    } else {
      const params = operation.parameters.map((param) => fieldName(param.name));
      this.write(`
let input_args = ${rustUtils.rustifyCaps(operation.name)}Args{
  ${params.join(",")}
};`);
      this.write(`
host_call(
  &self.binding,
  "${namespace.name}",
  "${operation.name}",
  &wapc_codec::messagepack::serialize(input_args)?,
)
`);
    }
    if (!retVoid) {
      this.write(`
        .map(|vec| {
        wapc_codec::messagepack::deserialize::<${
        rustUtils.types.apexToRustType(
          operation.type,
          context.config,
        )
      }>(vec.as_ref()).unwrap()
      })\n`);
    } else {
      this.write(`.map(|_vec| ())\n`);
    }
    this.write(`}\n`);
    super.triggerOperation(context);
  }

  override visitAllOperationsAfter(context: Context): void {
    if (context.config.hostPreamble == true) {
      this.write(`}\n\n`);
      delete context.config.hostPreamble;
    }
    super.triggerAllOperationsAfter(context);
  }
}
