import assert from "assert";
import sinon from "sinon";
import { getAccessHandler } from "../../../src/middleware/access";

describe("access", () => {
  let next = sinon.spy();
  let onError = sinon.spy();

  afterEach(() => {
    next.resetHistory();
    onError.resetHistory();
  });

  describe("returns (sync)", () => {
    it("adds access field to req", () => {
      let req = {
        erm: {},
      };

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
      let req = {
        erm: {},
      };

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

  describe("yields (async)", (done) => {
    it("adds access field to req", () => {
      let req = {
        erm: {},
      };

      getAccessHandler({
        access: () => {
          return Promise.resolve("private");
        },
      })(req, {}, () => {
        assert.equal(req.access, "private");
        done();
      });
    });

    it("calls onError", (done) => {
      let req = {
        erm: {},
      };
      let err = new Error("Something bad happened");

      getAccessHandler({
        access: () => {
          return Promise.reject(err);
        },
        onError,
      })(req, {}, next);

      setTimeout(() => {
        sinon.assert.calledOnce(onError);
        sinon.assert.calledWithExactly(onError, err, req, {}, next);
        sinon.assert.notCalled(next);
        assert.equal(req.access, undefined);
        done();
      });
    });

    it("throws an exception with unsupported parameter", (done) => {
      let req = {
        erm: {},
      };

      getAccessHandler({
        access: () => {
          return Promise.resolve("foo");
        },
        onError,
      })(req, {}, next);

      setTimeout(() => {
        sinon.assert.calledOnce(onError);
        sinon.assert.notCalled(next);
        assert.equal(req.access, undefined);
        done();
      });
    });
  });
});
