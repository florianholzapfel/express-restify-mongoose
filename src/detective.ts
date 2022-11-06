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
      schema = schema.path(schemaPath).schema;
    }
  }

  if (!schema) {
    return;
  }

  schemaPath = schema.path(keys[keys.length - 1]) || schema.path(schemaPath);

  if (!schemaPath && (!model || !model.discriminators)) {
    return;
  }

  if (schemaPath.caster && schemaPath.caster.options) {
    return schemaPath.caster.options.ref;
  } else if (schemaPath.options) {
    return schemaPath.options.ref;
  }
}
