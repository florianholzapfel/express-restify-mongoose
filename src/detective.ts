import mongoose from "mongoose";

export function detective(model: mongoose.Model<unknown>, path: string) {
  const keys = path.split(".");
  let schema = model.schema;
  let schemaPath = "";

  for (let i = 0, length = keys.length; i < length; i++) {
    if (schemaPath.length > 0) {
      schemaPath += ".";
    }

    schemaPath += keys[i];

    if (schema.path(schemaPath) && schema.path(schemaPath).schema) {
      // @ts-expect-error this is fine 🐶🔥
      schema = schema.path(schemaPath).schema;
    }
  }

  if (!schema) {
    return;
  }

  // @ts-expect-error this is fine 🐶🔥
  schemaPath = schema.path(keys[keys.length - 1]) || schema.path(schemaPath);

  if (!schemaPath && (!model || !model.discriminators)) {
    return;
  }

  // @ts-expect-error this is fine 🐶🔥
  if (schemaPath.caster && schemaPath.caster.options) {
    // @ts-expect-error this is fine 🐶🔥
    return schemaPath.caster.options.ref;
    // @ts-expect-error this is fine 🐶🔥
  } else if (schemaPath.options) {
    // @ts-expect-error this is fine 🐶🔥
    return schemaPath.options.ref;
  }
}
