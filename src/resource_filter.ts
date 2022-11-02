import { deleteProperty, getProperty, hasProperty } from "dot-prop";
import mongoose from "mongoose";
import detective from "mongoose-detective";
import { QueryOptions } from "./getQuerySchema";
import { Access, ExcludedMap, FilteredKeys } from "./types";

export class Filter {
  model: mongoose.Model<unknown> | undefined;
  filteredKeys: FilteredKeys;

  constructor(options: {
    model?: mongoose.Model<unknown>;
    excludedMap?: ExcludedMap;
    filteredKeys?: Partial<FilteredKeys>;
  }) {
    this.model = options.model;

    this.filteredKeys = {
      private: [],
      protected: [],
      ...options.filteredKeys,
    };

    if (options.model?.discriminators && options.excludedMap) {
      for (const modelName in options.model.discriminators) {
        if (options.excludedMap[modelName]) {
          this.filteredKeys.private = this.filteredKeys.private.concat(
            options.excludedMap[modelName].private
          );

          this.filteredKeys.protected = this.filteredKeys.protected.concat(
            options.excludedMap[modelName].protected
          );
        }
      }
    }
  }

  /**
   * Gets excluded keys for a given model and access.
   */
  getExcluded(options: {
    access: Access;
    excludedMap?: ExcludedMap | undefined;
    filteredKeys?: FilteredKeys;
    modelName?: string | undefined;
  }) {
    if (options.access === "private") {
      return [];
    }

    let entry =
      options.excludedMap && options.modelName
        ? options.excludedMap[options.modelName]
        : undefined;

    if (!entry) {
      entry = {
        private: [],
        protected: [],
        ...options.filteredKeys,
      };
    }

    return options.access === "protected"
      ? entry.private
      : entry.private.concat(entry.protected);
  }

  isExcluded(
    field: string,
    options: {
      access: Access;
      excludedMap: ExcludedMap;
      modelName: string;
    }
  ) {
    if (!field) {
      return false;
    }

    return this.getExcluded(options).includes(field);
  }

  /**
   * Removes excluded keys from a document.
   */
  filterItem<
    T extends undefined | Record<string, unknown> | Record<string, unknown>[]
  >(item: T, excluded?: string[]): T {
    if (Array.isArray(item)) {
      return item.map((i) => this.filterItem(i, excluded)) as T;
    }

    if (item && excluded) {
      if (typeof item.toObject === "function") {
        item = item.toObject();
      }

      for (let i = 0; i < excluded.length; i++) {
        deleteProperty(item as Record<string, unknown>, excluded[i]);
      }
    }

    return item;
  }

  /**
   * Removes excluded keys from a document with populated subdocuments.
   */
  filterPopulatedItem<
    T extends Record<string, unknown> | Record<string, unknown>[]
  >(
    item: T,
    options: {
      access: Access;
      excludedMap: ExcludedMap | undefined;
      populate: Exclude<QueryOptions["populate"], undefined>;
    }
  ): T {
    if (Array.isArray(item)) {
      return item.map((i) => this.filterPopulatedItem(i, options)) as T;
    }

    for (let i = 0; i < options.populate.length; i++) {
      if (!options.populate[i].path) {
        continue;
      }

      const excluded = this.getExcluded({
        access: options.access,
        excludedMap: options.excludedMap,
        modelName: detective(this.model, options.populate[i].path),
      });

      if (hasProperty(item, options.populate[i].path)) {
        this.filterItem(
          getProperty(item, options.populate[i].path) as T,
          excluded
        );
      } else {
        const pathToArray = options.populate[i].path
          .split(".")
          .slice(0, -1)
          .join(".");

        if (hasProperty(item, pathToArray)) {
          const array = getProperty(item, pathToArray);
          const pathToObject = options.populate[i].path
            .split(".")
            .slice(-1)
            .join(".");

          if (Array.isArray(array)) {
            this.filterItem(
              array.map((element) => getProperty(element, pathToObject)),
              excluded
            );
          }
        }
      }
    }

    return item;
  }

  /**
   * Removes excluded keys from a document.
   */
  filterObject(
    resource: Record<string, unknown> | Record<string, unknown>[],
    options?: {
      access: Access;
      excludedMap?: ExcludedMap;
      populate: QueryOptions["populate"];
    }
  ) {
    const filtered = this.filterItem(
      resource,
      this.getExcluded({
        access: options?.access || "public",
        excludedMap: options?.excludedMap,
        filteredKeys: this.filteredKeys,
        modelName: this.model?.modelName,
      })
    );

    if (options?.populate) {
      this.filterPopulatedItem(filtered, {
        access: options.access,
        excludedMap: options.excludedMap,
        populate: options.populate,
      });
    }

    return filtered;
  }
}
