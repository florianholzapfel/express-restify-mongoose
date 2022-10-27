declare module "lodash.isplainobject" {
  export default function isPlainObject(
    o: unknown
  ): o is Record<string, unknown>;
}
