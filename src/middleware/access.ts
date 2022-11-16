import { RequestHandler } from "express";
import { getErrorHandler } from "../errorHandler.js";
import { Access, Options } from "../types";

export function getAccessHandler(
  options: Required<Pick<Options, "access" | "idProperty" | "onError">>
) {
  const errorHandler = getErrorHandler(options);

  const fn: RequestHandler = function access(req, res, next) {
    const handler = function (access: Access) {
      if (!["public", "private", "protected"].includes(access)) {
        throw new Error(
          'Unsupported access, must be "public", "private" or "protected"'
        );
      }

      req.access = access;

      next();
    };

    const result = options.access(req);

    if (typeof result === "string") {
      handler(result);
    } else {
      result.then(handler).catch((err) => errorHandler(err, req, res, next));
    }
  };

  return fn;
}
