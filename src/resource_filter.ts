import { getProperty, hasProperty } from "dot-prop";
import mongoose from "mongoose";
import { detective } from "./detective";
import { QueryOptions } from "./getQuerySchema";
import { Access, ExcludedMap, FilteredKeys } from "./types";
import { weedout } from "./weedout";

export class Filter {
  excludedMap: ExcludedMap = new Map();

  add(
    model: mongoose.Model<unknown>,
    options: {
      filteredKeys: FilteredKeys;
    }
  ) {
    if (model.discriminators) {
      for (const modelName in model.discriminators) {
        const excluded = this.excludedMap.get(modelName);

        if (excluded) {
          options.filteredKeys.private = options.filteredKeys.private.concat(
            excluded.filteredKeys.private
          );

          options.filteredKeys.protected =
            options.filteredKeys.protected.concat(
              excluded.filteredKeys.protected
            );
        }
      }
    }

    this.excludedMap.set(model.modelName, {
      filteredKeys: options.filteredKeys,
      model,
    });
  }

  /**
   * Gets excluded keys for a given model and access.
   */
  getExcluded(options: { access: Access; modelName: string }) {
    if (options.access === "private") {
      return [];
    }

    const filteredKeys = this.excludedMap.get(options.modelName)?.filteredKeys;

    if (!filteredKeys) {
      return [];
    }

    return options.access === "protected"
      ? filteredKeys.private
      : filteredKeys.private.concat(filteredKeys.protected);
  }

  /**
   * Removes excluded keys from a document.
   */
  private filterItem<
    T extends undefined | Record<string, unknown> | Record<string, unknown>[]
  >(item: T, excluded: string[]): T {
    if (!item) {
      return item;
    }

    if (Array.isArray(item)) {
      return item.map((i) => this.filterItem(i, excluded)) as T;
    }

    if (excluded) {
      if (typeof item.toObject === "function") {
        item = item.toObject();
      }

      for (let i = 0; i < excluded.length; i++) {
        weedout(item as Record<string, unknown>, excluded[i]);
      }
    }

    return item;
  }

  /**
   * Removes excluded keys from a document with populated subdocuments.
   */
  private filterPopulatedItem<
    T extends Record<string, unknown> | Record<string, unknown>[]
  >(
    item: T,
    options: {
      access: Access;
      modelName: string;
      populate: Exclude<QueryOptions["populate"], undefined | string>;
    }
  ): T {
    if (Array.isArray(item)) {
      return item.map((i) => this.filterPopulatedItem(i, options)) as T;
    }

    for (let i = 0; i < options.populate.length; i++) {
      if (!options.populate[i].path) {
        continue;
      }

      const model = this.excludedMap.get(options.modelName)?.model;

      if (!model) {
        continue;
      }

      const excluded = this.getExcluded({
        access: options.access,
        modelName: detective(model, options.populate[i].path),
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
    options: {
      access: Access;
      modelName: string;
      populate?: Exclude<QueryOptions["populate"], string>;
    }
  ) {
    const excluded = this.getExcluded({
      access: options.access,
      modelName: options.modelName,
    });

    const filtered = this.filterItem(resource, excluded);

    if (options?.populate) {
      this.filterPopulatedItem(filtered, {
        access: options.access,
        modelName: options.modelName,
        populate: options.populate,
      });
    }

    return filtered;
  }
}
