import { ErrorRequestHandler } from "express";
import { STATUS_CODES } from "http";
import { Options } from "./types";

export function getErrorHandler(
  options: Pick<Options, "idProperty" | "onError">
) {
  const fn: ErrorRequestHandler = function errorHandler(err, req, res, next) {
    if (
      err.message === STATUS_CODES[404] ||
      (req.params?.id &&
        err.path === options.idProperty &&
        err.name === "CastError")
    ) {
      req.erm.statusCode = 404;
    } else {
      req.erm.statusCode =
        req.erm.statusCode && req.erm.statusCode >= 400
          ? req.erm.statusCode
          : 400;
    }

    options.onError(err, req, res, next);
  };

  return fn;
}
