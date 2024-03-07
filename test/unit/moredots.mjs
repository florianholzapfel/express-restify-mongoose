import assert from "assert";
import { moredots } from "../../dist/moredots.js";

describe("moredots", () => {
  it("recursively converts objects to dot notation", () => {
    const result = moredots({
      foo: {
        bar: {
          baz: 42,
        },
      },
    });

    assert.strictEqual(result["foo.bar.baz"], 42);
  });
});
