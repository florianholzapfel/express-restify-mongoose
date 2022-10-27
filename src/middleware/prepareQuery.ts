import { RequestHandler } from "express";
import isCoordinates from "is-coordinates";
import { z } from "zod";
import { getErrorHandler } from "../errorHandler";
import {
  Options,
  QueryOptions,
  RawQueryOptions,
} from "../express-restify-mongoose";

const PopulateSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value;
    }

    if (value.startsWith("{") || value.startsWith("[")) {
      return JSON.parse(value);
    }

    return value;
  },
  z.union([
    z.string(),
    z.object({
      path: z.string(),
      select: z.string().optional(),
      // Configure populate query to not use strict populate to maintain
      // behavior from Mongoose previous to v6 (unless already configured)
      strictPopulate: z.boolean().optional().default(false),
    }),
    z.array(
      z.object({
        path: z.string(),
        select: z.string().optional(),
        strictPopulate: z.boolean().optional().default(false),
      })
    ),
  ])
);

const SelectSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  if (value.startsWith("{")) {
    return JSON.parse(value);
  }

  return Object.fromEntries(
    value
      .split(",")
      .filter(Boolean)
      .map((field) => {
        if (field.startsWith("-")) {
          return [field.substring(1), 0];
        }

        return [field, 1];
      })
  );
}, z.record(z.number().min(0).max(1)));

const SortSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  if (value.startsWith("{")) {
    return JSON.parse(value);
  }

  return value;
}, z.union([z.string(), z.record(z.enum(["asc", "desc", "ascending", "descending"])), z.record(z.number().min(-1).max(1))]));

const SkipLimitSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  return parseInt(value, 10);
}, z.number());

const DistinctSchema = z.string();

export function getPrepareQueryHandler(
  options: Pick<Options, "allowRegex" | "idProperty" | "onError">
) {
  const errorHandler = getErrorHandler(options);

  function jsonQueryParser(key: string, value: unknown) {
    if (key === "$regex" && !options.allowRegex) {
      return undefined;
    }

    if (
      Array.isArray(value) &&
      key[0] !== "$" &&
      key !== "coordinates" &&
      !isCoordinates(value)
    ) {
      return { $in: value };
    }

    return value;
  }

  function parseQueryOptions({
    populate,
    select,
    ...queryOptions
  }: RawQueryOptions): QueryOptions {
    const parsedQueryOptions: QueryOptions = queryOptions;

    if (
      parsedQueryOptions.select &&
      Object.keys(parsedQueryOptions.select).length === 0
    ) {
      delete parsedQueryOptions.select;
    }

    if (populate) {
      if (typeof populate === "string") {
        parsedQueryOptions.populate = populate
          .split(",")
          .filter(Boolean)
          .map((field) => {
            const pop: Exclude<QueryOptions["populate"], undefined>[number] = {
              path: field,
              strictPopulate: false,
            };

            if (!parsedQueryOptions.select) {
              return pop;
            }

            for (const [key, value] of Object.entries(
              parsedQueryOptions.select
            )) {
              if (key.startsWith(`${field}.`)) {
                if (pop.select) {
                  pop.select += " ";
                } else {
                  pop.select = "";
                }

                if (value === 0) {
                  pop.select += "-";
                }

                pop.select += key.substring(field.length + 1);

                delete parsedQueryOptions.select?.[key];
              }
            }

            // If other specific fields are selected, add the populated field
            if (!parsedQueryOptions.select[field]) {
              parsedQueryOptions.select[field] = 1;
            }

            return pop;
          });
      }
    }

    return parsedQueryOptions;
  }

  const QuerySchema = z.preprocess((value) => {
    if (typeof value !== "string") {
      return value;
    }

    return JSON.parse(value, jsonQueryParser);
  }, z.record(z.unknown()));

  const fn: RequestHandler = function prepareQuery(req, res, next) {
    const query: RawQueryOptions = {};

    for (const [key, value] of Object.entries(req.query)) {
      try {
        switch (key) {
          case "query": {
            query[key] = QuerySchema.parse(value);

            break;
          }
          case "populate": {
            query[key] = PopulateSchema.parse(value);

            break;
          }
          case "select": {
            query[key] = SelectSchema.parse(value);

            break;
          }
          case "sort": {
            query[key] = SortSchema.parse(value);

            break;
          }
          case "limit":
          case "skip": {
            query[key] = SkipLimitSchema.parse(value);

            break;
          }
          case "distinct": {
            query[key] = DistinctSchema.parse(value);

            break;
          }
        }
      } catch (e) {
        return errorHandler(new Error(`invalid_value_${key}`), req, res, next);
      }
    }

    req.erm = req.erm || {};
    req.erm.query = parseQueryOptions(query);

    next();
  };

  return fn;
}
