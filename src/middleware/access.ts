import { RequestHandler } from "express";
import { getErrorHandler } from "../errorHandler";
import { Access, Options } from "../express-restify-mongoose";

export function getAccessHandler(
  options: Required<Pick<Options, "access" | "idProperty" | "onError">>
) {
  const errorHandler = getErrorHandler(options);

  const fn: RequestHandler = function access(req, res, next) {
    const handler = function (err: Error | undefined, access: Access) {
      if (err) {
        return errorHandler(err, req, res, next);
      }

      req.access = access;

      next();
    };

    // length of a function refers to the number or arguments
    // in this case, it means access is async with a callback
    if (options.access.length > 1) {
      options.access(req, handler);
    } else {
      handler(undefined, options.access(req));
    }
  };

  return fn;
}
