import { Application } from "express";
import mongoose from "mongoose";
import { deprecate } from "util";
import { getAccessHandler } from "./middleware/access.js";
import { getEnsureContentTypeHandler } from "./middleware/ensureContentType.js";
import { getFilterAndFindByIdHandler } from "./middleware/filterAndFindById.js";
import { getOnErrorHandler } from "./middleware/onError.js";
import { getOutputFnHandler } from "./middleware/outputFn.js";
import { getPrepareOutputHandler } from "./middleware/prepareOutput.js";
import { getPrepareQueryHandler } from "./middleware/prepareQuery.js";
import { operations } from "./operations.js";
import { Filter } from "./resource_filter.js";
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
    updateDeep: true,
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

  if (typeof app.delete === "undefined") {
    // @ts-expect-error restify
    app.delete = app.del;
  }

  // @ts-expect-error restify
  const modelMiddleware = async (req, res, next) => {
    const getModel = serveOptions?.modelFactory?.getModel;
    
    req.erm = {
      model: typeof getModel === 'function' ? await getModel(req) : model,
    };
    
    next();
  };

  const accessMiddleware = serveOptions.access
    ? getAccessHandler({
        access: serveOptions.access,
        idProperty: serveOptions.idProperty,
        onError: serveOptions.onError,
      })
    : [];

  const ensureContentType = getEnsureContentTypeHandler(serveOptions);
  const filterAndFindById = getFilterAndFindByIdHandler(serveOptions);
  const prepareQuery = getPrepareQueryHandler(serveOptions);
  const prepareOutput = getPrepareOutputHandler(
    serveOptions,
    model.modelName,
    filter
  );

  app.get(
    uriItems,
    modelMiddleware,
    prepareQuery,
    serveOptions.preMiddleware,
    serveOptions.preRead,
    accessMiddleware,
    ops.getItems,
    prepareOutput
  );

  app.get(
    uriCount,
    modelMiddleware,
    prepareQuery,
    serveOptions.preMiddleware,
    serveOptions.preRead,
    accessMiddleware,
    ops.getCount,
    prepareOutput
  );

  app.get(
    uriItem,
    modelMiddleware,
    prepareQuery,
    serveOptions.preMiddleware,
    serveOptions.preRead,
    accessMiddleware,
    ops.getItem,
    prepareOutput
  );

  app.get(
    uriShallow,
    modelMiddleware,
    prepareQuery,
    serveOptions.preMiddleware,
    serveOptions.preRead,
    accessMiddleware,
    ops.getShallow,
    prepareOutput
  );

  app.post(
    uriItems,
    modelMiddleware,
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
    modelMiddleware,
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
    modelMiddleware,
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
    modelMiddleware,
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
    modelMiddleware,
    prepareQuery,
    serveOptions.preMiddleware,
    serveOptions.preDelete,
    ops.deleteItems,
    prepareOutput
  );

  app.delete(
    uriItem,
    modelMiddleware,
    prepareQuery,
    serveOptions.preMiddleware,
    serveOptions.findOneAndRemove ? [] : filterAndFindById,
    serveOptions.preDelete,
    ops.deleteItem,
    prepareOutput
  );

  return uriItems;
}
