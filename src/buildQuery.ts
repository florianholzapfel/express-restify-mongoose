import mongoose from "mongoose";
import { QueryOptions } from "./getQuerySchema";
import { Options } from "./types";

export function getBuildQuery(
  options: Pick<Options, "lean" | "limit" | "readPreference">
) {
  return function buildQuery<T>(
    query: mongoose.Query<unknown, unknown>,
    queryOptions: QueryOptions | undefined
  ): Promise<T> {
    const promise = new Promise((resolve) => {
      if (!queryOptions) {
        return resolve(query);
      }

      if (queryOptions.query) {
        query.where(queryOptions.query);
      }

      if (queryOptions.skip) {
        query.skip(queryOptions.skip);
      }

      if (
        options.limit &&
        (!queryOptions.limit || queryOptions.limit > options.limit)
      ) {
        queryOptions.limit = options.limit;
      }

      if (
        queryOptions.limit &&
        // @ts-expect-error this is fine 🐶🔥
        query.op !== "countDocuments" &&
        !queryOptions.distinct
      ) {
        query.limit(queryOptions.limit);
      }

      if (queryOptions.sort) {
        // @ts-expect-error this is fine 🐶🔥
        query.sort(queryOptions.sort);
      }

      if (queryOptions.populate) {
        // @ts-expect-error this is fine 🐶🔥
        query.populate(queryOptions.populate);
      }

      if (queryOptions.select) {
        query.select(queryOptions.select);
      }

      if (queryOptions.distinct) {
        query.distinct(queryOptions.distinct);
      }

      if (options.readPreference) {
        query.read(options.readPreference);
      }

      if (options.lean) {
        query.lean(options.lean);
      }

      resolve(query);
    });

    return promise as Promise<T>;
  };
}
