import { deepKeys } from "dot-prop";
import { Request, RequestHandler } from "express";
import { STATUS_CODES } from "http";
import isPlainObject from "lodash.isplainobject";
import mongoose from "mongoose";
import { getBuildQuery } from "./buildQuery";
import { getErrorHandler } from "./errorHandler";
import { ExcludedMap, Options } from "./express-restify-mongoose";
import { Filter } from "./resource_filter";

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
  >,
  excludedMap: ExcludedMap,
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
        excludedMap: excludedMap,
      })
      .includes(req.erm.query.distinct);
  }

  const getItems: RequestHandler = function (req, res, next) {
    const contextModel = (req.erm && req.erm.model) || model;

    if (isDistinctExcluded(req)) {
      req.erm.result = [];
      req.erm.statusCode = 200;
      return next();
    }

    options.contextFilter(contextModel, req, (filteredContext) => {
      buildQuery<Record<string, unknown>[]>(
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
    const contextModel = (req.erm && req.erm.model) || model;

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
    const contextModel = (req.erm && req.erm.model) || model;

    options.contextFilter(contextModel, req, (filteredContext) => {
      buildQuery<Record<string, unknown> | null>(
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
    const contextModel = (req.erm && req.erm.model) || model;

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
    const contextModel = (req.erm && req.erm.model) || model;

    if (isDistinctExcluded(req)) {
      req.erm.result = [];
      req.erm.statusCode = 200;
      return next();
    }

    options.contextFilter(contextModel, req, (filteredContext) => {
      buildQuery<Record<string, unknown> | null>(
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
    const contextModel = (req.erm && req.erm.model) || model;

    if (options.findOneAndRemove) {
      options.contextFilter(contextModel, req, (filteredContext) => {
        findById(filteredContext, req.params.id)
          .findOneAndRemove()
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
      req.erm
        .document!.remove()
        .then(() => {
          req.erm.statusCode = 204;

          next();
        })
        .catch((err: Error) => errorHandler(err, req, res, next));
    }
  };

  const createObject: RequestHandler = function (req, res, next) {
    const contextModel = (req.erm && req.erm.model) || model;

    req.body = filter.filterObject(req.body || {}, {
      access: req.access,
      populate: req.erm.query?.populate,
    });

    if (req.body._id === null) {
      delete req.body._id;
    }

    if (contextModel.schema.options.versionKey) {
      delete req.body[contextModel.schema.options.versionKey];
    }

    contextModel
      .create(req.body)
      .then((item) => {
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
    const contextModel = (req.erm && req.erm.model) || model;

    req.body = filter.filterObject(req.body || {}, {
      access: req.access,
      populate: req.erm.query?.populate,
    });

    delete req.body._id;

    if (contextModel.schema.options.versionKey) {
      delete req.body[contextModel.schema.options.versionKey];
    }

    function depopulate(src: Record<string, unknown>) {
      const dst: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(src)) {
        const path = contextModel.schema.path(key);

        if (path && path.caster && path.caster.instance === "ObjectID") {
          if (Array.isArray(value)) {
            for (let j = 0; j < value.length; ++j) {
              if (typeof value[j] === "object") {
                dst[key] = dst[key] || [];
                dst[key].push(value[j]._id);
              }
            }
          } else if (isPlainObject(value)) {
            dst[key] = value._id;
          }
        } else if (isPlainObject(value)) {
          if (path && path.instance === "ObjectID") {
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

    const cleanBody = deepKeys(depopulate(req.body));

    if (options.findOneAndUpdate) {
      options.contextFilter(contextModel, req, (filteredContext) => {
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
        req.erm.document!.set(key, value);
      }

      req.erm
        .document!.save()
        .then((item) => {
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
