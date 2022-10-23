import assert from "assert";
import sinon from "sinon";
import { getPrepareQueryHandler } from "../../../src/middleware/prepareQuery";

describe("prepareQuery", () => {
  let options = {
    onError: sinon.spy(),
    allowRegex: true,
  };

  let next = sinon.spy();

  afterEach(() => {
    options.onError.resetHistory();
    options.allowRegex = true;
    next.resetHistory();
  });

  describe("jsonQueryParser", () => {
    it("converts $regex to undefined", () => {
      let req = {
        query: {
          query: '{"foo":{"$regex":"bar"}}',
        },
      };

      options.allowRegex = false;

      getPrepareQueryHandler(options)(req, {}, next);

      assert.deepEqual(req.erm.query, {
        query: {
          foo: {},
        },
      });
      sinon.assert.calledOnce(next);
      sinon.assert.calledWithExactly(next);
      sinon.assert.notCalled(options.onError);
    });

    it("converts [] to $in", () => {
      let req = {
        query: {
          query: '{"foo":["bar"]}',
        },
      };

      getPrepareQueryHandler(options)(req, {}, next);

      assert.deepEqual(req.erm.query, {
        query: {
          foo: { $in: ["bar"] },
        },
      });
      sinon.assert.calledOnce(next);
      sinon.assert.calledWithExactly(next);
      sinon.assert.notCalled(options.onError);
    });
  });

  it("calls next when query is empty", () => {
    getPrepareQueryHandler(options)({}, {}, next);

    sinon.assert.calledOnce(next);
    sinon.assert.calledWithExactly(next);
    sinon.assert.notCalled(options.onError);
  });

  it("ignores keys that are not whitelisted and calls next", () => {
    let req = {
      query: {
        foo: "bar",
      },
    };

    getPrepareQueryHandler(options)(req, {}, next);

    sinon.assert.calledOnce(next);
    sinon.assert.calledWithExactly(next);
    sinon.assert.notCalled(options.onError);
  });

  it("calls next when query key is valid json", () => {
    let req = {
      query: {
        query: '{"foo":"bar"}',
      },
    };

    getPrepareQueryHandler(options)(req, {}, next);

    assert.deepEqual(req.erm.query, {
      query: JSON.parse(req.query.query),
    });
    sinon.assert.calledOnce(next);
    sinon.assert.calledWithExactly(next);
    sinon.assert.notCalled(options.onError);
  });

  it("calls onError when query key is invalid json", () => {
    let req = {
      erm: {},
      params: {},
      query: {
        query: "not json",
      },
    };

    getPrepareQueryHandler(options)(req, {}, next);

    sinon.assert.calledOnce(options.onError);
    sinon.assert.calledWithExactly(
      options.onError,
      sinon.match.instanceOf(Error) /*new Error('invalid_json_query')*/,
      req,
      {},
      next
    );
    sinon.assert.notCalled(next);
  });

  it("calls next when sort key is valid json", () => {
    let req = {
      query: {
        sort: '{"foo":"bar"}',
      },
    };

    getPrepareQueryHandler(options)(req, {}, next);

    assert.deepEqual(req.erm.query, {
      sort: JSON.parse(req.query.sort),
    });
    sinon.assert.calledOnce(next);
    sinon.assert.calledWithExactly(next);
    sinon.assert.notCalled(options.onError);
  });

  it("calls next when sort key is a string", () => {
    let req = {
      query: {
        sort: "foo",
      },
    };

    getPrepareQueryHandler(options)(req, {}, next);

    assert.deepEqual(req.erm.query, req.query);
    sinon.assert.calledOnce(next);
    sinon.assert.calledWithExactly(next);
    sinon.assert.notCalled(options.onError);
  });

  it("calls next when skip key is a string", () => {
    let req = {
      query: {
        skip: "1",
      },
    };

    getPrepareQueryHandler(options)(req, {}, next);

    assert.deepEqual(req.erm.query, req.query);
    sinon.assert.calledOnce(next);
    sinon.assert.calledWithExactly(next);
    sinon.assert.notCalled(options.onError);
  });

  it("calls next when limit key is a string", () => {
    let req = {
      query: {
        limit: "1",
      },
    };

    getPrepareQueryHandler(options)(req, {}, next);

    assert.deepEqual(req.erm.query, req.query);
    sinon.assert.calledOnce(next);
    sinon.assert.calledWithExactly(next);
    sinon.assert.notCalled(options.onError);
  });

  it("calls next when distinct key is a string", () => {
    let req = {
      query: {
        distinct: "foo",
      },
    };

    getPrepareQueryHandler(options)(req, {}, next);

    assert.deepEqual(req.erm.query, req.query);
    sinon.assert.calledOnce(next);
    sinon.assert.calledWithExactly(next);
    sinon.assert.notCalled(options.onError);
  });

  it("calls next when populate key is a string", () => {
    let req = {
      query: {
        populate: "foo",
      },
    };

    getPrepareQueryHandler(options)(req, {}, next);

    assert.deepEqual(req.erm.query, {
      populate: [
        {
          path: "foo",
          strictPopulate: false,
        },
      ],
    });
    sinon.assert.calledOnce(next);
    sinon.assert.calledWithExactly(next);
    sinon.assert.notCalled(options.onError);
  });

  describe("select", () => {
    it("parses a string to include fields", () => {
      let req = {
        query: {
          select: "foo",
        },
      };

      getPrepareQueryHandler(options)(req, {}, next);

      assert.deepEqual(req.erm.query, {
        select: {
          foo: 1,
        },
      });
      sinon.assert.calledOnce(next);
      sinon.assert.calledWithExactly(next);
      sinon.assert.notCalled(options.onError);
    });

    it("parses a string to exclude fields", () => {
      let req = {
        query: {
          select: "-foo",
        },
      };

      getPrepareQueryHandler(options)(req, {}, next);

      assert.deepEqual(req.erm.query, {
        select: {
          foo: 0,
        },
      });
      sinon.assert.calledOnce(next);
      sinon.assert.calledWithExactly(next);
      sinon.assert.notCalled(options.onError);
    });

    it("parses a comma separated list of fields to include", () => {
      let req = {
        query: {
          select: "foo,bar",
        },
      };

      getPrepareQueryHandler(options)(req, {}, next);

      assert.deepEqual(req.erm.query, {
        select: {
          foo: 1,
          bar: 1,
        },
      });
      sinon.assert.calledOnce(next);
      sinon.assert.calledWithExactly(next);
      sinon.assert.notCalled(options.onError);
    });

    it("parses a comma separated list of fields to exclude", () => {
      let req = {
        query: {
          select: "-foo,-bar",
        },
      };

      getPrepareQueryHandler(options)(req, {}, next);

      assert.deepEqual(req.erm.query, {
        select: {
          foo: 0,
          bar: 0,
        },
      });
      sinon.assert.calledOnce(next);
      sinon.assert.calledWithExactly(next);
      sinon.assert.notCalled(options.onError);
    });

    it("parses a comma separated list of nested fields", () => {
      let req = {
        query: {
          select: "foo.bar,baz.qux.quux",
        },
      };

      getPrepareQueryHandler(options)(req, {}, next);

      assert.deepEqual(req.erm.query, {
        select: {
          "foo.bar": 1,
          "baz.qux.quux": 1,
        },
      });
      sinon.assert.calledOnce(next);
      sinon.assert.calledWithExactly(next);
      sinon.assert.notCalled(options.onError);
    });
  });

  describe("populate", () => {
    it("parses a string to populate a path", () => {
      let req = {
        query: {
          populate: "foo",
        },
      };

      getPrepareQueryHandler(options)(req, {}, next);

      assert.deepEqual(req.erm.query, {
        populate: [
          {
            path: "foo",
            strictPopulate: false,
          },
        ],
      });
      sinon.assert.calledOnce(next);
      sinon.assert.calledWithExactly(next);
      sinon.assert.notCalled(options.onError);
    });

    it("parses a string to populate multiple paths", () => {
      let req = {
        query: {
          populate: "foo,bar",
        },
      };

      getPrepareQueryHandler(options)(req, {}, next);

      assert.deepEqual(req.erm.query, {
        populate: [
          {
            path: "foo",
            strictPopulate: false,
          },
          {
            path: "bar",
            strictPopulate: false,
          },
        ],
      });
      sinon.assert.calledOnce(next);
      sinon.assert.calledWithExactly(next);
      sinon.assert.notCalled(options.onError);
    });

    it("accepts an object to populate a path", () => {
      let req = {
        query: {
          populate: {
            path: "foo.bar",
            select: "baz",
            match: { qux: "quux" },
            options: { sort: "baz" },
          },
        },
      };

      getPrepareQueryHandler(options)(req, {}, next);

      assert.deepEqual(req.erm.query, {
        populate: [
          {
            path: "foo.bar",
            select: "baz",
            match: { qux: "quux" },
            options: { sort: "baz" },
            strictPopulate: false,
          },
        ],
      });
      sinon.assert.calledOnce(next);
      sinon.assert.calledWithExactly(next);
      sinon.assert.notCalled(options.onError);
    });

    it("parses a string to populate and select fields", () => {
      let req = {
        query: {
          populate: "foo",
          select: "foo.bar,foo.baz",
        },
      };

      getPrepareQueryHandler(options)(req, {}, next);

      assert.deepEqual(req.erm.query, {
        populate: [
          {
            path: "foo",
            select: "bar baz",
            strictPopulate: false,
          },
        ],
      });
      sinon.assert.calledOnce(next);
      sinon.assert.calledWithExactly(next);
      sinon.assert.notCalled(options.onError);
    });
  });
});
