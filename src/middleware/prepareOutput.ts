import { RequestHandler } from "express";
import runSeries from "run-series";
import { getErrorHandler } from "../errorHandler";
import { ExcludedMap, Options } from "../express-restify-mongoose";
import { Filter } from "../resource_filter";

export function getPrepareOutputHandler(
  options: Pick<
    Options,
    | "idProperty"
    | "onError"
    | "postCreate"
    | "postRead"
    | "postUpdate"
    | "postDelete"
    | "outputFn"
    | "postProcess"
    | "totalCountHeader"
  >,
  excludedMap: ExcludedMap,
  filter: Filter
) {
  const errorHandler = getErrorHandler(options);

  const fn: RequestHandler = function prepareOutput(req, res, next) {
    const postMiddleware = (() => {
      switch (req.method.toLowerCase()) {
        case "get": {
          return Array.isArray(options.postRead)
            ? options.postRead
            : [options.postRead];
        }
        case "post": {
          if (req.erm.statusCode === 201) {
            return Array.isArray(options.postCreate)
              ? options.postCreate
              : [options.postCreate];
          }

          return Array.isArray(options.postUpdate)
            ? options.postUpdate
            : [options.postUpdate];
        }
        case "put":
        case "patch": {
          return Array.isArray(options.postUpdate)
            ? options.postUpdate
            : [options.postUpdate];
        }
        case "delete": {
          return Array.isArray(options.postDelete)
            ? options.postDelete
            : [options.postDelete];
        }
        default: {
          return [];
        }
      }
    })().filter(Boolean);

    const callback = (err: Error | undefined) => {
      if (err) {
        return errorHandler(err, req, res, next);
      }

      // TODO: this will, but should not, filter /count queries
      if (req.erm.result) {
        req.erm.result = filter.filterObject(req.erm.result, {
          access: req.access,
          excludedMap: excludedMap,
          populate: req.erm.query.populate,
        });
      }

      if (options.totalCountHeader && typeof req.erm.totalCount === "number") {
        res.header(
          typeof options.totalCountHeader === "string"
            ? options.totalCountHeader
            : "X-Total-Count",
          `${req.erm.totalCount}`
        );
      }

      const promise = options.outputFn(req, res);

      if (options.postProcess) {
        if (promise && typeof promise.then === "function") {
          promise
            .then(() => {
              options.postProcess?.(req, res);
            })
            .catch((err) => errorHandler(err, req, res, next));
        } else {
          options.postProcess(req, res);
        }
      }
    };

    if (!postMiddleware || postMiddleware.length === 0) {
      return callback(undefined);
    }

    runSeries(
      postMiddleware.map((middleware) => {
        return (cb) => {
          middleware(req, res, cb);
        };
      }),
      callback
    );
  };

  return fn;
}
