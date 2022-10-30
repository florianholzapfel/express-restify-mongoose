import { z } from "zod";

const PopulateOptionsSchema = z.object({
  path: z.string(),
  match: z.record(z.unknown()).optional(),
  options: z.record(z.unknown()).optional(),
  select: z.string().optional(),
  // Configure populate query to not use strict populate to maintain
  // behavior from Mongoose previous to v6 (unless already configured)
  strictPopulate: z.boolean().optional().default(false),
});

const PopulateSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  if (value.startsWith("{") || value.startsWith("[")) {
    return JSON.parse(value);
  }

  return value;
}, z.union([z.string(), PopulateOptionsSchema, z.array(PopulateOptionsSchema)]));

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
      if (!value.populate) {
        const { populate, ...rest } = value;

        return rest;
      } else if (typeof value.populate === "string") {
        const populate: z.infer<typeof PopulateOptionsSchema>[] = value.populate
          .split(",")
          .filter(Boolean)
          .map((field) => {
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
            if (Object.keys(value.select).length > 0 && !value.select[field]) {
              value.select[field] = 1;
            }

            return pop;
          });

        return {
          ...value,
          populate,
        };
      } else if (!Array.isArray(value.populate)) {
        return {
          ...value,
          populate: [value.populate],
        };
      }

      return value;
    })
    .transform((value) => {
      if (!value.select || Object.keys(value.select).length === 0) {
        const { select, ...rest } = value;

        return rest;
      }

      return value;
    });
}