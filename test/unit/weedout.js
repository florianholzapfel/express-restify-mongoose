import assert from "assert";
import { weedout } from "../../dist/weedout.js";

describe("weedout", () => {
  it("removes root keys", () => {
    const src = {
      foo: "bar",
    };

    weedout(src, "foo");

    assert.equal(src.foo, undefined);
  });

  it("ignores undefined root keys", () => {
    const src = {
      foo: "bar",
    };

    weedout(src, "bar");

    assert.deepEqual(src, {
      foo: "bar",
    });
  });

  it("removes nested keys", () => {
    const src = {
      foo: {
        bar: {
          baz: "42",
        },
      },
    };

    weedout(src, "foo.bar.baz");

    assert.deepEqual(src.foo.bar, {});
  });

  it("ignores undefined nested keys", () => {
    const src = {
      foo: {
        bar: {
          baz: "42",
        },
      },
    };

    weedout(src, "baz.bar.foo");

    assert.deepEqual(src, {
      foo: {
        bar: {
          baz: "42",
        },
      },
    });
  });

  it("removes keys inside object arrays", () => {
    const src = {
      foo: [
        {
          bar: {
            baz: "3.14",
          },
        },
        {
          bar: {
            baz: "pi",
          },
        },
      ],
    };

    weedout(src, "foo.bar.baz");

    src.foo.forEach((foo) => {
      assert.deepEqual(foo.bar, {});
    });
  });

  it("removes keys inside object arrays inside object arrays", () => {
    const src = {
      foo: [
        {
          bar: [
            {
              baz: "to",
            },
            {
              baz: "be",
            },
          ],
        },
        {
          bar: [
            {
              baz: "or",
            },
            {
              baz: "not",
            },
          ],
        },
      ],
    };

    weedout(src, "foo.bar.baz");

    src.foo.forEach((foo) => {
      foo.bar.forEach((bar) => {
        assert.deepEqual(bar, {});
      });
    });
  });
});
