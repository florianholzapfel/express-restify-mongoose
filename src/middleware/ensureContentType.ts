import { RequestHandler } from "express";
import { getErrorHandler } from "../errorHandler.js";
import { Options } from "../types";

export function getEnsureContentTypeHandler(
  options: Pick<Options, "idProperty" | "onError">
) {
  const errorHandler = getErrorHandler(options);

  const fn: RequestHandler = function ensureContentType(req, res, next) {
    const contentType = req.headers["content-type"];

    if (!contentType) {
      return errorHandler(new Error("missing_content_type"), req, res, next);
    }

    if (!contentType.includes("application/json")) {
      return errorHandler(new Error("invalid_content_type"), req, res, next);
    }

    next();
  };

  return fn;
}
