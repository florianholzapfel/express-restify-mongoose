import { RequestHandler } from "express";
import { STATUS_CODES } from "http";
import mongoose from "mongoose";
import { getErrorHandler } from "../errorHandler";
import { Options } from "../express-restify-mongoose";

export function getFilterAndFindByIdHandler(
  options: Pick<
    Options,
    "contextFilter" | "idProperty" | "onError" | "readPreference"
  >,
  model: mongoose.Model<unknown>
) {
  const errorHandler = getErrorHandler(options);

  const fn: RequestHandler = function filterAndFindById(req, res, next) {
    const contextModel = (req.erm && req.erm.model) || model;

    if (!req.params.id) {
      return next();
    }

    options.contextFilter(contextModel, req, (filteredContext) => {
      filteredContext
        .findOne()
        .and({
          [options.idProperty]: req.params.id,
        })
        .lean(false)
        .read(options.readPreference || "p")
        .exec()
        .then(
          (doc) => {
            if (!doc) {
              return errorHandler(new Error(STATUS_CODES[404]), req, res, next);
            }

            req.erm.document = doc;

            next();
          },
          (err) => errorHandler(err, req, res, next)
        );
    });
  };

  return fn;
}
