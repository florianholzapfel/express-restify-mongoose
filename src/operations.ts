import { Request, RequestHandler } from "express";
import { STATUS_CODES } from "http";
import isPlainObject from "lodash.isplainobject";
import mongoose from "mongoose";
import { getBuildQuery } from "./buildQuery.js";
import { getErrorHandler } from "./errorHandler.js";
import { moredots } from "./moredots.js";
import { Filter } from "./resource_filter.js";
import { Options } from "./types";

export function operations(
  model: mongoose.Model<unknown>,
  options: Pick<
    Options,
    | "contextFilter"
    | "findOneAndRemove"
    | "findOneAndUpdate"
    | "idProperty"
    | "lean"
    | "limit"
    | "onError"
    | "readPreference"
    | "runValidators"
    | "totalCountHeader"
    | "upsert"
    | "updateDeep"
  >,
  filter: Filter
) {
  const buildQuery = getBuildQuery(options);
  const errorHandler = getErrorHandler(options);

  function findById(filteredContext: mongoose.Model<unknown>, id: unknown) {
    return filteredContext.findOne().and([
      {
        [options.idProperty]: id,
      },
    ]);
  }

  function isDistinctExcluded(req: Request) {
    if (!req.erm.query?.distinct) {
      return false;
    }

    return filter
      .getExcluded({
        access: req.access,
        modelName: model.modelName,
      })
      .includes(req.erm.query.distinct);
  }

  const getItems: RequestHandler = function (req, res, next) {
    const contextModel = req.erm.model;
    if (!contextModel) {
      return errorHandler(new Error('Model is undefined.'), req, res, next);
    }

    if (isDistinctExcluded(req)) {
      req.erm.result = [];
      req.erm.statusCode = 200;
      return next();
    }

    options.contextFilter(contextModel, req, (filteredContext) => {
      buildQuery<Record<string, unknown>[]>(
        // @ts-expect-error this is fine 🐶🔥
        filteredContext.find(),
        req.erm.query
      )
        .then((items) => {
          req.erm.result = items;
          req.erm.statusCode = 200;

          if (options.totalCountHeader && !req.erm.query?.distinct) {
            options.contextFilter(contextModel, req, (countFilteredContext) => {
              buildQuery<number>(countFilteredContext.countDocuments(), {
                ...req.erm.query,
                skip: 0,
                limit: 0,
              })
                .then((count) => {
                  req.erm.totalCount = count;
                  next();
                })
                .catch((err) => errorHandler(err, req, res, next));
            });
          } else {
            next();
          }
        })
        .catch((err) => errorHandler(err, req, res, next));
    });
  };

  const getCount: RequestHandler = function (req, res, next) {
    const contextModel = req.erm.model;
    if (!contextModel) {
      return errorHandler(new Error('Model is undefined.'), req, res, next);
    }

    options.contextFilter(contextModel, req, (filteredContext) => {
      buildQuery(filteredContext.countDocuments(), req.erm.query)
        .then((count) => {
          req.erm.result = { count: count };
          req.erm.statusCode = 200;

          next();
        })
        .catch((err) => errorHandler(err, req, res, next));
    });
  };

  const getShallow: RequestHandler = function (req, res, next) {
    const contextModel = req.erm.model;
    if (!contextModel) {
      return errorHandler(new Error('Model is undefined.'), req, res, next);
    }

    options.contextFilter(contextModel, req, (filteredContext) => {
      buildQuery<Record<string, unknown> | null>(
        // @ts-expect-error this is fine 🐶🔥
        findById(filteredContext, req.params.id),
        req.erm.query
      )
        .then((item) => {
          if (!item) {
            return errorHandler(new Error(STATUS_CODES[404]), req, res, next);
          }

          for (const prop in item) {
            item[prop] =
              typeof item[prop] === "object" && prop !== "_id"
                ? true
                : item[prop];
          }

          req.erm.result = item;
          req.erm.statusCode = 200;

          next();
        })
        .catch((err) => errorHandler(err, req, res, next));
    });
  };

  const deleteItems: RequestHandler = function (req, res, next) {
    const contextModel = req.erm.model;
    if (!contextModel) {
      return errorHandler(new Error('Model is undefined.'), req, res, next);
    }

    options.contextFilter(contextModel, req, (filteredContext) => {
      buildQuery(filteredContext.deleteMany(), req.erm.query)
        .then(() => {
          req.erm.statusCode = 204;

          next();
        })
        .catch((err) => errorHandler(err, req, res, next));
    });
  };

  const getItem: RequestHandler = function (req, res, next) {
    const contextModel = req.erm.model;
    if (!contextModel) {
      return errorHandler(new Error('Model is undefined.'), req, res, next);
    }

    if (isDistinctExcluded(req)) {
      req.erm.result = [];
      req.erm.statusCode = 200;
      return next();
    }

    options.contextFilter(contextModel, req, (filteredContext) => {
      buildQuery<Record<string, unknown> | null>(
        // @ts-expect-error this is fine 🐶🔥
        findById(filteredContext, req.params.id),
        req.erm.query
      )
        .then((item) => {
          if (!item) {
            return errorHandler(new Error(STATUS_CODES[404]), req, res, next);
          }

          req.erm.result = item;
          req.erm.statusCode = 200;

          next();
        })
        .catch((err) => errorHandler(err, req, res, next));
    });
  };

  const deleteItem: RequestHandler = function (req, res, next) {
    const contextModel = req.erm.model;
    if (!contextModel) {
      return errorHandler(new Error('Model is undefined.'), req, res, next);
    }

    if (options.findOneAndRemove) {
      options.contextFilter(contextModel, req, (filteredContext) => {
        // @ts-expect-error this is fine 🐶🔥
        findById(filteredContext, req.params.id)
          .findOneAndDelete() // switched to findOneAndDelete to add support for Mongoose 7 and 8
          .then((item) => {
            if (!item) {
              return errorHandler(new Error(STATUS_CODES[404]), req, res, next);
            }

            req.erm.statusCode = 204;

            next();
          })
          .catch((err: Error) => errorHandler(err, req, res, next));
      });
    } else {
      req.erm.document
        ?.deleteOne() // switched to deleteOne to add support for Mongoose 7 and 8
        .then(() => {
          req.erm.statusCode = 204;

          next();
        })
        .catch((err: Error) => errorHandler(err, req, res, next));
    }
  };

  const createObject: RequestHandler = function (req, res, next) {
    const contextModel = req.erm.model;
    if (!contextModel) {
      return errorHandler(new Error('Model is undefined.'), req, res, next);
    }

    req.body = filter.filterObject(req.body || {}, {
      access: req.access,
      modelName: model.modelName,
      // @ts-expect-error this is fine 🐶🔥
      populate: req.erm.query?.populate,
    });

    if (req.body._id === null) {
      delete req.body._id;
    }

    // @ts-expect-error this is fine 🐶🔥
    if (contextModel.schema.options.versionKey) {
      // @ts-expect-error this is fine 🐶🔥
      delete req.body[contextModel.schema.options.versionKey];
    }

    contextModel
      .create(req.body)
      .then((item) => {
        // @ts-expect-error this is fine 🐶🔥
        return contextModel.populate(item, req.erm.query?.populate || []);
      })
      .then((item) => {
        req.erm.result = item as unknown as Record<string, unknown>;
        req.erm.statusCode = 201;

        next();
      })
      .catch((err) => errorHandler(err, req, res, next));
  };

  const modifyObject: RequestHandler = function (req, res, next) {
    const contextModel = req.erm.model;
    if (!contextModel) {
      return errorHandler(new Error('Model is undefined.'), req, res, next);
    }

    req.body = filter.filterObject(req.body || {}, {
      access: req.access,
      modelName: model.modelName,
      // @ts-expect-error this is fine 🐶🔥
      populate: req.erm.query?.populate,
    });

    delete req.body._id;

    // @ts-expect-error this is fine 🐶🔥
    if (contextModel.schema.options.versionKey) {
      // @ts-expect-error this is fine 🐶🔥
      delete req.body[contextModel.schema.options.versionKey];
    }

    function depopulate(src: Record<string, unknown>) {
      const dst: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(src)) {
        // @ts-expect-error this is fine 🐶🔥
        const path = contextModel.schema.path(key);

        // @ts-expect-error this is fine 🐶🔥
        // Add support for Mongoose 7 and 8 while keeping backwards-compatibility to 6 by allowing ObjectID and ObejctId 
        if (path && path.caster && (path.caster.instance === "ObjectID" || path.caster.instance === "ObjectId")) {
          if (Array.isArray(value)) {
            for (let j = 0; j < value.length; ++j) {
              if (typeof value[j] === "object") {
                dst[key] = dst[key] || [];
                // @ts-expect-error this is fine 🐶🔥
                dst[key].push(value[j]._id);
              }
            }
          } else if (isPlainObject(value)) {
            dst[key] = value._id;
          }
        } else if (isPlainObject(value)) {
        // Add support for Mongoose 7 and 8 while keeping backwards-compatibility to 6 by allowing ObjectID and ObejctId 
          if (path && (path.instance === "ObjectID" || path.instance === "ObjectId")) {
            dst[key] = value._id;
          } else {
            dst[key] = depopulate(value);
          }
        }

        if (typeof dst[key] === "undefined") {
          dst[key] = value;
        }
      }

      return dst;
    }

    let cleanBody = depopulate(req.body);

    if (options.updateDeep) { 
      cleanBody = moredots(cleanBody);
    }

    if (options.findOneAndUpdate) {
      options.contextFilter(contextModel, req, (filteredContext) => {
        // @ts-expect-error this is fine 🐶🔥
        findById(filteredContext, req.params.id)
          .findOneAndUpdate(
            {},
            {
              $set: cleanBody,
            },
            {
              new: true,
              upsert: options.upsert,
              runValidators: options.runValidators,
            }
          )
          .exec()
          .then((item) => {
            // @ts-expect-error this is fine 🐶🔥
            return contextModel.populate(item, req.erm.query?.populate || []);
          })
          .then((item) => {
            if (!item) {
              return errorHandler(new Error(STATUS_CODES[404]), req, res, next);
            }

            req.erm.result = item as unknown as Record<string, unknown>;
            req.erm.statusCode = 200;

            next();
          })
          .catch((err) => errorHandler(err, req, res, next));
      });
    } else {
      for (const [key, value] of Object.entries(cleanBody)) {
        req.erm.document?.set(key, value);
      }

      req.erm.document
        ?.save()
        .then((item) => {
          // @ts-expect-error this is fine 🐶🔥
          return contextModel.populate(item, req.erm.query?.populate || []);
        })
        .then((item) => {
          req.erm.result = item as unknown as Record<string, unknown>;
          req.erm.statusCode = 200;

          next();
        })
        .catch((err: Error) => errorHandler(err, req, res, next));
    }
  };

  return {
    getItems,
    getCount,
    getItem,
    getShallow,
    createObject,
    modifyObject,
    deleteItems,
    deleteItem,
  };
}
