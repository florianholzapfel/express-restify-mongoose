import { Application } from "express";
import mongoose from "mongoose";
import { deprecate } from "util";
import { getAccessHandler } from "./middleware/access";
import { getEnsureContentTypeHandler } from "./middleware/ensureContentType";
import { getFilterAndFindByIdHandler } from "./middleware/filterAndFindById";
import { getOnErrorHandler } from "./middleware/onError";
import { getOutputFnHandler } from "./middleware/outputFn";
import { getPrepareOutputHandler } from "./middleware/prepareOutput";
import { getPrepareQueryHandler } from "./middleware/prepareQuery";
import { operations } from "./operations";
import { Filter } from "./resource_filter";
import { Options } from "./types";

const defaultOptions: Omit<Options, "contextFilter" | "outputFn" | "onError"> =
  {
    prefix: "/api",
    version: "/v1",
    idProperty: "_id",
    restify: false,
    allowRegex: false,
    runValidators: false,
    readPreference: "primary",
    totalCountHeader: false,
    private: [],
    protected: [],
    lean: true,
    findOneAndUpdate: true,
    findOneAndRemove: true,
    upsert: false,
    preMiddleware: [],
    preCreate: [],
    preRead: [],
    preUpdate: [],
    preDelete: [],
  };

const filter = new Filter();

export function serve(
  app: Application,
  model: mongoose.Model<unknown>,
  options: Partial<Options> = {}
) {
  const serveOptions: Options = {
    ...defaultOptions,
    name: typeof options.name === "string" ? options.name : model.modelName,
    contextFilter: (model, req, done) => done(model),
    outputFn: getOutputFnHandler(
      typeof options.restify === "boolean"
        ? !options.restify
        : !defaultOptions.restify
    ),
    onError: getOnErrorHandler(
      typeof options.restify === "boolean"
        ? !options.restify
        : !defaultOptions.restify
    ),
    ...options,
  };

  model.schema.eachPath((name, path) => {
    if (path.options.access) {
      switch (path.options.access.toLowerCase()) {
        case "private":
          serveOptions.private.push(name);
          break;
        case "protected":
          serveOptions.protected.push(name);
          break;
      }
    }
  });

  filter.add(model, {
    filteredKeys: {
      private: serveOptions.private,
      protected: serveOptions.protected,
    },
  });

  const ops = operations(model, serveOptions, filter);

  let uriItem = `${serveOptions.prefix}${serveOptions.version}/${serveOptions.name}`;

  if (uriItem.indexOf("/:id") === -1) {
    uriItem += "/:id";
  }

  const uriItems = uriItem.replace("/:id", "");
  const uriCount = uriItems + "/count";
  const uriShallow = uriItem + "/shallow";

  app.use((req, res, next) => {
    req.erm = {};

    next();
  });

  const accessMiddleware = serveOptions.access
    ? getAccessHandler({
        access: serveOptions.access,
        idProperty: serveOptions.idProperty,
        onError: serveOptions.onError,
      })
    : [];

  const ensureContentType = getEnsureContentTypeHandler(serveOptions);
  const filterAndFindById = getFilterAndFindByIdHandler(serveOptions, model);
  const prepareQuery = getPrepareQueryHandler(serveOptions);
  const prepareOutput = getPrepareOutputHandler(
    serveOptions,
    model.modelName,
    filter
  );

  app.get(
    uriItems,
    prepareQuery,
    serveOptions.preMiddleware,
    serveOptions.preRead,
    accessMiddleware,
    ops.getItems,
    prepareOutput
  );

  app.get(
    uriCount,
    prepareQuery,
    serveOptions.preMiddleware,
    serveOptions.preRead,
    accessMiddleware,
    ops.getCount,
    prepareOutput
  );

  app.get(
    uriItem,
    prepareQuery,
    serveOptions.preMiddleware,
    serveOptions.preRead,
    accessMiddleware,
    ops.getItem,
    prepareOutput
  );

  app.get(
    uriShallow,
    prepareQuery,
    serveOptions.preMiddleware,
    serveOptions.preRead,
    accessMiddleware,
    ops.getShallow,
    prepareOutput
  );

  app.post(
    uriItems,
    prepareQuery,
    ensureContentType,
    serveOptions.preMiddleware,
    serveOptions.preCreate,
    accessMiddleware,
    ops.createObject,
    prepareOutput
  );

  app.post(
    uriItem,
    deprecate(
      prepareQuery,
      "express-restify-mongoose: in a future major version, the POST method to update resources will be removed. Use PATCH instead."
    ),
    ensureContentType,
    serveOptions.preMiddleware,
    serveOptions.findOneAndUpdate ? [] : filterAndFindById,
    serveOptions.preUpdate,
    accessMiddleware,
    ops.modifyObject,
    prepareOutput
  );

  app.put(
    uriItem,
    deprecate(
      prepareQuery,
      "express-restify-mongoose: in a future major version, the PUT method will replace rather than update a resource. Use PATCH instead."
    ),
    ensureContentType,
    serveOptions.preMiddleware,
    serveOptions.findOneAndUpdate ? [] : filterAndFindById,
    serveOptions.preUpdate,
    accessMiddleware,
    ops.modifyObject,
    prepareOutput
  );

  app.patch(
    uriItem,
    prepareQuery,
    ensureContentType,
    serveOptions.preMiddleware,
    serveOptions.findOneAndUpdate ? [] : filterAndFindById,
    serveOptions.preUpdate,
    accessMiddleware,
    ops.modifyObject,
    prepareOutput
  );

  app.delete(
    uriItems,
    prepareQuery,
    serveOptions.preMiddleware,
    serveOptions.preDelete,
    ops.deleteItems,
    prepareOutput
  );

  app.delete(
    uriItem,
    prepareQuery,
    serveOptions.preMiddleware,
    serveOptions.findOneAndRemove ? [] : filterAndFindById,
    serveOptions.preDelete,
    ops.deleteItem,
    prepareOutput
  );

  return uriItems;
}
