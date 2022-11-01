import assert from "assert";
import sinon from "sinon";
import { getAccessHandler } from "../../../src/middleware/access";

describe("access", () => {
  let next = sinon.spy();

  afterEach(() => {
    next.resetHistory();
  });

  describe("returns (sync)", () => {
    it("adds access field to req", () => {
      let req = {};

      getAccessHandler({
        access: () => {
          return "private";
        },
      })(req, {}, next);

      sinon.assert.calledOnce(next);
      sinon.assert.calledWithExactly(next);
      assert.equal(req.access, "private");
    });

    it("throws an exception with unsupported parameter", () => {
      let req = {};

      assert.throws(() => {
        getAccessHandler({
          access: () => {
            return "foo";
          },
        })(req, {}, next);
      }, Error('Unsupported access, must be "public", "private" or "protected"'));

      sinon.assert.notCalled(next);
      assert.equal(req.access, undefined);
    });
  });

  describe("yields (async)", () => {
    it("adds access field to req", () => {
      let req = {};

      getAccessHandler({
        access: () => {
          return Promise.resolve("private");
        },
      })(req, {}, next);

      sinon.assert.calledOnce(next);
      sinon.assert.calledWithExactly(next);
      assert.equal(req.access, "private");
    });

    it("calls onError", () => {
      let req = {
        erm: {},
        params: {},
      };
      let onError = sinon.spy();
      let err = new Error("Something bad happened");

      getAccessHandler({
        access: () => {
          return Promise.resolve("private");
        },
        onError: onError,
      })(req, {}, next);

      sinon.assert.calledOnce(onError);
      sinon.assert.calledWithExactly(onError, err, req, {}, next);
      sinon.assert.notCalled(next);
      assert.equal(req.access, undefined);
    });

    it("throws an exception with unsupported parameter", () => {
      let req = {};

      assert.throws(() => {
        getAccessHandler({
          access: () => {
            return Promise.resolve("foo");
          },
        })(req, {}, next);
      }, Error('Unsupported access, must be "public", "private" or "protected"'));

      sinon.assert.notCalled(next);
      assert.equal(req.access, undefined);
    });
  });
});
