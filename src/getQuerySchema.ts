import { z } from "zod";

const PopulateOptionsSchema = z.object({
  path: z.string(),
  match: z.record(z.unknown()).optional(),
  options: z.record(z.unknown()).optional(),
  select: z.string().optional(),
  populate: z.record(z.unknown()).optional(),
  // Configure populate query to not use strict populate to maintain
  // behavior from Mongoose previous to v6 (unless already configured)
  strictPopulate: z.boolean().optional().default(false),
});

const PopulateSchema = z.preprocess((value) => {
  if (typeof value === "string") {
    if (value.startsWith("{")) {
      return JSON.parse(`[${value}]`);
    }

    if (value.startsWith("[")) {
      return JSON.parse(value);
    }

    return value;
  }

  return Array.isArray(value) ? value : [value];
}, z.union([z.string(), z.array(PopulateOptionsSchema)]));

const SelectSchema = z.preprocess((value) => {
  const fieldToRecord = (field: string) => {
    if (field.startsWith("-")) {
      return [field.substring(1), 0];
    }

    return [field, 1];
  };

  if (typeof value === "string") {
    if (value.startsWith("{")) {
      return JSON.parse(value);
    }

    return Object.fromEntries(
      value.split(",").filter(Boolean).map(fieldToRecord)
    );
  }

  if (Array.isArray(value)) {
    return Object.fromEntries(value.map(fieldToRecord));
  }

  return value;
}, z.record(z.number().min(0).max(1)));

const SortSchema = z.preprocess((value) => {
  if (typeof value === "string" && value.startsWith("{")) {
    return JSON.parse(value);
  }

  return value;
}, z.union([z.string(), z.record(z.enum(["asc", "desc", "ascending", "descending", "-1", "1"])), z.record(z.number().min(-1).max(1))]));

const LimitSkipSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  return Number(value);
}, z.number());

export function getQueryOptionsSchema({ allowRegex }: { allowRegex: boolean }) {
  const QuerySchema = z
    .preprocess((value) => {
      if (!allowRegex && `${value}`.toLowerCase().includes("$regex")) {
        throw new Error("regex_not_allowed");
      }

      if (typeof value !== "string") {
        return value;
      }

      return JSON.parse(value);
    }, z.record(z.unknown()))
    .transform((value) => {
      return Object.fromEntries(
        Object.entries(value).map(([key, value]) => {
          if (Array.isArray(value) && !key.startsWith("$")) {
            return [key, { $in: value }];
          }

          return [key, value];
        })
      );
    });

  return z
    .object({
      query: QuerySchema.optional(),
      populate: PopulateSchema.optional(),
      select: SelectSchema.optional(),
      sort: SortSchema.optional(),
      limit: LimitSkipSchema.optional(),
      skip: LimitSkipSchema.optional(),
      distinct: z.string().optional(),
    })
    .transform((value) => {
      if (typeof value.populate === "undefined") {
        return value;
      }

      const populate =
        typeof value.populate === "string"
          ? value.populate
              .split(",")
              .filter(Boolean)
              .map<z.infer<typeof PopulateOptionsSchema>>((field) => {
                const pop: z.infer<typeof PopulateOptionsSchema> = {
                  path: field,
                  strictPopulate: false,
                };

                if (!value.select) {
                  return pop;
                }

                for (const [k, v] of Object.entries(value.select)) {
                  if (k.startsWith(`${field}.`)) {
                    if (pop.select) {
                      pop.select += " ";
                    } else {
                      pop.select = "";
                    }

                    if (v === 0) {
                      pop.select += "-";
                    }

                    pop.select += k.substring(field.length + 1);

                    delete value.select[k];
                  }
                }

                // If other specific fields are selected, add the populated field
                if (
                  Object.keys(value.select).length > 0 &&
                  !value.select[field]
                ) {
                  value.select[field] = 1;
                }

                return pop;
              })
          : value.populate;

      return {
        ...value,
        populate,
      };
    })
    .transform((value) => {
      if (
        !value.populate ||
        (Array.isArray(value.populate) && value.populate.length === 0)
      ) {
        delete value.populate;
      }

      if (!value.select || Object.keys(value.select).length === 0) {
        delete value.select;
      }

      return value;
    });
}

export type QueryOptions = z.infer<ReturnType<typeof getQueryOptionsSchema>>;
