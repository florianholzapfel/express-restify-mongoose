import { RequestHandler } from "express";
import runSeries from "run-series";
import { getErrorHandler } from "../errorHandler";
import { ExcludedMap, Options } from "../express-restify-mongoose";

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
  excludedMap: ExcludedMap
) {
  const errorHandler = getErrorHandler(options);

  const fn: RequestHandler = function prepareOutput(req, res, next) {
    const postMiddleware = (() => {
      switch (req.method.toLowerCase()) {
        case "get":
          return options.postRead;
        case "post":
          if (req.erm.statusCode === 201) {
            return options.postCreate;
          }

          return options.postUpdate;
        case "put":
        case "patch":
          return options.postUpdate;
        case "delete":
          return options.postDelete;
      }
    })();

    const callback = (err: Error | undefined) => {
      if (err) {
        return errorHandler(err, req, res, next);
      }

      // TODO: this will, but should not, filter /count queries
      if (req.erm.result) {
        const opts = {
          access: req.access,
          excludedMap: excludedMap,
          populate: req.erm && req.erm.query ? req.erm.query.populate : null,
        };

        req.erm.result = options.filter
          ? options.filter.filterObject(req.erm.result, opts)
          : req.erm.result;
      }

      if (options.totalCountHeader && typeof req.erm.totalCount === "number") {
        res.header(
          typeof options.totalCountHeader === "string"
            ? options.totalCountHeader
            : "X-Total-Count",
          req.erm.totalCount
        );
      }

      const promise = options.outputFn(req, res);

      if (options.postProcess) {
        if (promise && typeof promise.then === "function") {
          promise
            .then(() => {
              options.postProcess(req, res);
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
