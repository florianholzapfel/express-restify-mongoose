import { RequestHandler } from "express";
import { getErrorHandler } from "../errorHandler.js";
import { getQueryOptionsSchema } from "../getQuerySchema.js";
import { Options } from "../types";

export function getPrepareQueryHandler(
  options: Pick<Options, "allowRegex" | "idProperty" | "onError">
) {
  const errorHandler = getErrorHandler(options);

  const fn: RequestHandler = function prepareQuery(req, res, next) {
    req.erm = req.erm || {};

    try {
      req.erm.query = getQueryOptionsSchema({
        allowRegex: options.allowRegex,
      }).parse(req.query || {});

      next();
    } catch (e) {
      return errorHandler(new Error("invalid_json_query"), req, res, next);
    }
  };

  return fn;
}
