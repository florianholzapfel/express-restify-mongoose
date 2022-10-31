import { RequestHandler } from "express";
import { getErrorHandler } from "../errorHandler";
import { Options } from "../types";

export function getAccessHandler(
  options: Required<Pick<Options, "access" | "idProperty" | "onError">>
) {
  const errorHandler = getErrorHandler(options);

  const fn: RequestHandler = async function access(req, res, next) {
    try {
      const access = await options.access(req);

      if (!["public", "private", "protected"].includes(access)) {
        throw new Error(
          'Unsupported access, must be "public", "private" or "protected"'
        );
      }

      req.access = access;

      next();
    } catch (err) {
      errorHandler(err, req, res, next);
    }
  };

  return fn;
}
