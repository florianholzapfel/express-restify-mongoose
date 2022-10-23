import { getProperty, hasProperty } from "dot-prop";
import mongoose from "mongoose";
import detective from "mongoose-detective";
import weedout from "weedout";
import { Access, ExcludedMap, FilteredKeys } from "./express-restify-mongoose";

export class Filter {
  model: mongoose.Model<unknown> | undefined;
  filteredKeys: FilteredKeys;

  constructor({
    model,
    excludedMap,
    filteredKeys,
  }: {
    model?: mongoose.Model<unknown>;
    excludedMap?: ExcludedMap;
    filteredKeys?: Partial<FilteredKeys>;
  }) {
    this.model = model;

    this.filteredKeys = {
      private: [],
      protected: [],
      ...filteredKeys,
    };

    if (model?.discriminators && excludedMap) {
      for (const modelName in model.discriminators) {
        if (excludedMap[modelName]) {
          this.filteredKeys.private = this.filteredKeys.private.concat(
            excludedMap[modelName].private
          );

          this.filteredKeys.protected = this.filteredKeys.protected.concat(
            excludedMap[modelName].protected
          );
        }
      }
    }
  }

  /**
   * Gets excluded keys for a given model and access.
   */
  getExcluded({
    access,
    excludedMap,
    filteredKeys,
    modelName = this.model?.modelName,
  }: {
    access: Access;
    excludedMap: ExcludedMap;
    filteredKeys?: FilteredKeys;
    modelName?: string;
  }) {
    if (access === "private") {
      return [];
    }

    let entry = modelName ? excludedMap[modelName] : undefined;

    if (!entry) {
      entry = {
        private: [],
        protected: [],
        ...filteredKeys,
      };
    }

    return access === "protected"
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
        if (excluded[i].includes(".")) {
          weedout(item, excluded[i]);
        } else {
          delete item[excluded[i]];
        }
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
    {
      access,
      excludedMap,
      populate,
    }: {
      access: Access;
      excludedMap: ExcludedMap;
      populate: { path: string }[];
    }
  ): T {
    if (Array.isArray(item)) {
      return item.map((i) =>
        this.filterPopulatedItem(i, {
          access,
          excludedMap,
          populate,
        })
      ) as T;
    }

    for (let i = 0; i < populate.length; i++) {
      if (!populate[i].path) {
        continue;
      }

      const excluded = this.getExcluded({
        access: access,
        excludedMap: excludedMap,
        modelName: detective(this.model, populate[i].path),
      });

      if (hasProperty(item, populate[i].path)) {
        this.filterItem(getProperty(item, populate[i].path) as T, excluded);
      } else {
        const pathToArray = populate[i].path.split(".").slice(0, -1).join(".");

        if (hasProperty(item, pathToArray)) {
          const array = getProperty(item, pathToArray);
          const pathToObject = populate[i].path.split(".").slice(-1).join(".");

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
    {
      access,
      excludedMap,
      populate,
    }: {
      access: Access;
      excludedMap: ExcludedMap;
      populate: { path: string }[] | undefined;
    }
  ) {
    const filtered = this.filterItem(
      resource,
      this.getExcluded({ access, excludedMap })
    );

    if (populate) {
      this.filterPopulatedItem(filtered, {
        access,
        excludedMap,
        populate,
      });
    }

    return filtered;
  }
}
