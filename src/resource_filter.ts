import get from "lodash.get";
import has from "lodash.has";
import mongoose from "mongoose";
import detective from "mongoose-detective";
import weedout from "weedout";
import { Access, ExcludedMap, FilteredKeys } from "./express-restify-mongoose";

export class Filter {
  model: mongoose.Model<unknown>;
  excludedMap: ExcludedMap;
  filteredKeys: FilteredKeys;

  constructor(opts: {
    model: mongoose.Model<unknown>;
    excludedMap: ExcludedMap;
    filteredKeys: FilteredKeys;
  }) {
    this.model = opts.model;
    this.excludedMap = {};
    this.filteredKeys = opts.filteredKeys;

    if (opts.model.discriminators) {
      for (const modelName in this.model.discriminators) {
        if (opts.excludedMap[modelName]) {
          this.filteredKeys.private = this.filteredKeys.private.concat(
            opts.excludedMap[modelName].private
          );

          this.filteredKeys.protected = this.filteredKeys.protected.concat(
            opts.excludedMap[modelName].protected
          );
        }
      }
    }
  }

  /**
   * Gets excluded keys for a given model and access.
   */
  getExcluded(opts: { access: Access }) {
    if (opts.access === "private") {
      return [];
    }

    let entry = this.excludedMap[this.model.modelName];

    if (!entry) {
      entry = {
        private: this.filteredKeys.private || [],
        protected: this.filteredKeys.protected || [],
      };
    }

    return opts.access === "protected"
      ? entry.private
      : entry.private.concat(entry.protected);
  }

  isExcluded(
    field: string,
    opts: {
      access: Access;
      excludedMap: ExcludedMap;
      modelName: string;
    }
  ) {
    if (!field) {
      return false;
    }

    return this.getExcluded(opts).includes(field);
  }

  /**
   * Removes excluded keys from a document.
   */
  filterItem(
    item: Record<string, unknown> | Record<string, unknown>[],
    excluded: string[]
  ) {
    if (Array.isArray(item)) {
      return item.map((i) => this.filterItem(i, excluded));
    }

    if (typeof item.toObject === "function") {
      item = item.toObject();
    }

    for (let i = 0, length = excluded.length; i < length; i++) {
      if (excluded[i].indexOf(".") > 0) {
        weedout(item, excluded[i]);
      } else {
        delete item[excluded[i]];
      }
    }

    return item;
  }

  /**
   * Removes excluded keys from a document with populated subdocuments.
   */
  filterPopulatedItem(
    item: Record<string, unknown>,
    opts: {
      access: Access;
      excludedMap: ExcludedMap;
      populate: { path: string }[];
    }
  ) {
    if (Array.isArray(item)) {
      return item.map((i) => this.filterPopulatedItem(i, opts));
    }

    for (let i = 0; i < opts.populate.length; i++) {
      if (!opts.populate[i].path) {
        continue;
      }

      const excluded = this.getExcluded({
        access: opts.access,
        excludedMap: opts.excludedMap,
        modelName: detective(this.model, opts.populate[i].path),
      });

      if (has(item, opts.populate[i].path)) {
        this.filterItem(get(item, opts.populate[i].path), excluded);
      } else {
        const pathToArray = opts.populate[i].path
          .split(".")
          .slice(0, -1)
          .join(".");

        if (has(item, pathToArray)) {
          const array = get(item, pathToArray);
          const pathToObject = opts.populate[i].path
            .split(".")
            .slice(-1)
            .join(".");

          if (Array.isArray(array)) {
            this.filterItem(
              array.map((element) => get(element, pathToObject)),
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
    resource: Record<string, unknown>,
    opts: {
      access?: Access;
      excludedMap?: ExcludedMap;
      modelName?: string;
      populate: { path: string }[];
    }
  ) {
    const options = {
      access: "public" as const,
      excludedMap: {},
      modelName: this.model.modelName,
      ...opts,
    };

    const filtered = this.filterItem(resource, this.getExcluded(options));

    if (options.populate) {
      this.filterPopulatedItem(filtered, options);
    }

    return filtered;
  }
}
