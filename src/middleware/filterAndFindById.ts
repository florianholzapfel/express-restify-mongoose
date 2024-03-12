import { RequestHandler } from "express";
import { STATUS_CODES } from "http";
import mongoose from "mongoose";
import { getErrorHandler } from "../errorHandler.js";
import { Options } from "../types";

export function getFilterAndFindByIdHandler(
  options: Pick<
    Options,
    "contextFilter" | "idProperty" | "onError" | "readPreference"
  >
) {
  const errorHandler = getErrorHandler(options);

  const fn: RequestHandler = function filterAndFindById(req, res, next) {
    const contextModel = req.erm.model;
    if (!contextModel) {
      return errorHandler(new Error('Model is undefined.'), req, res, next);
    }

    if (!req.params.id) {
      return next();
    }

    options.contextFilter(contextModel, req, (filteredContext) => {
      filteredContext
        // @ts-expect-error this is fine 🐶🔥
        .findOne()
        .and({
          [options.idProperty]: req.params.id,
        })
        .lean(false)
        .read(options.readPreference || "p")
        .exec()
        .then((doc: mongoose.Document | null) => {
          if (!doc) {
            return errorHandler(new Error(STATUS_CODES[404]), req, res, next);
          }

          req.erm.document = doc;

          next();
        })
        .catch((err: Error) => errorHandler(err, req, res, next));
    });
  };

  return fn;
}
