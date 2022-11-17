import isPlainObject from "lodash.isplainobject";

export function moredots(
  src: Record<string, unknown>,
  dst: Record<string, unknown> = {},
  prefix = ""
) {
  for (const [key, value] of Object.entries(src)) {
    if (isPlainObject(value)) {
      moredots(value, dst, `${prefix}${key}.`);
    } else {
      dst[`${prefix}${key}`] = value;
    }
  }

  return dst;
}
