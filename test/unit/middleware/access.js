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

  describe("yields (async)", () => {
    it("adds access field to req", (done) => {
      let req = {
        erm: {},
      };

      getAccessHandler({
        access: () => {
          return Promise.resolve("private");
        },
        onError,
      })(req, {}, next);

      setTimeout(() => {
        sinon.assert.calledOnceWithExactly(next);
        sinon.assert.notCalled(onError);
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
        sinon.assert.notCalled(next);
        sinon.assert.calledOnceWithExactly(onError, err, req, {}, next);
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
        sinon.assert.notCalled(next);
        sinon.assert.calledOnce(onError);
        assert.equal(req.access, undefined);
        done();
      });
    });
  });
});
