import assert from "assert";
import mongoose from "mongoose";
import sinon from "sinon";
import { getOnErrorHandler } from "../../../dist/middleware/onError.js";

describe("onError", () => {
  const req = {
    erm: {
      statusCode: 500,
    },
  };

  let res = {
    setHeader: () => undefined,
    status: function () {
      return this;
    },
    send: () => undefined,
  };

  let setHeader = sinon.spy(res, "setHeader");
  let status = sinon.spy(res, "status");
  let send = sinon.spy(res, "send");
  let next = sinon.spy();

  afterEach(() => {
    setHeader.resetHistory();
    status.resetHistory();
    send.resetHistory();
    next.resetHistory();
  });

  it("with express", () => {
    getOnErrorHandler(true)(new Error("An error occurred"), req, res, next);

    sinon.assert.calledOnce(setHeader);
    sinon.assert.calledWithExactly(
      setHeader,
      "Content-Type",
      "application/json"
    );
    sinon.assert.calledOnce(status);
    sinon.assert.calledWithExactly(status, 500);
    sinon.assert.calledOnce(send);
    sinon.assert.calledWithExactly(send, {
      message: "An error occurred",
      name: "Error",
    });
    sinon.assert.notCalled(next);
  });

  it("with restify", () => {
    getOnErrorHandler(false)(new Error("An error occurred"), req, res, next);

    sinon.assert.calledOnce(setHeader);
    sinon.assert.calledWithExactly(
      setHeader,
      "Content-Type",
      "application/json"
    );
    sinon.assert.notCalled(status);
    sinon.assert.calledOnce(send);
    sinon.assert.calledWithExactly(send, 500, {
      message: "An error occurred",
      name: "Error",
    });
    sinon.assert.notCalled(next);
  });
  describe("internal details", () => {
    // what the client receives: the body as JSON
    function sent(err) {
      getOnErrorHandler(true)(err, req, res, next);

      return JSON.parse(JSON.stringify(send.firstCall.args[0]));
    }

    function assertNoStack(value, path = "body") {
      if (typeof value !== "object" || value === null) {
        return;
      }

      for (const key of Object.keys(value)) {
        assert.ok(
          !(key === "stack" && typeof value[key] === "string"),
          `${path}.${key} must not be sent`
        );
        assertNoStack(value[key], `${path}.${key}`);
      }
    }

    it("removes the reason of a CastError", () => {
      let reason;

      try {
        new mongoose.Types.ObjectId("not-an-object-id");
      } catch (err) {
        reason = err;
      }

      const body = sent(
        new mongoose.Error.CastError(
          "ObjectId",
          "not-an-object-id",
          "_id",
          reason
        )
      );

      assert.equal(body.name, "CastError");
      assert.equal(body.path, "_id");
      assert.ok(!("reason" in body));
      assertNoStack(body);
    });

    it("removes a reason that carries an enumerable stack", () => {
      // the shape serialize-error 7 produced for a nested error
      const err = new Error("An error occurred");
      err.reason = {
        name: "BSONError",
        message: "invalid input",
        stack:
          "BSONError: invalid input\n    at /srv/app/node_modules/bson/x.js:1:1",
      };

      assert.deepEqual(sent(err), {
        message: "An error occurred",
        name: "Error",
      });
    });

    it("removes the cause", () => {
      const err = new Error("An error occurred");
      err.cause = new Error("internal");

      assert.deepEqual(sent(err), {
        message: "An error occurred",
        name: "Error",
      });
    });

    it("removes reason, cause and stack from validation errors", () => {
      const err = new mongoose.Error.ValidationError();
      const nested = new mongoose.Error.CastError(
        "Number",
        "abc",
        "age",
        new Error("internal")
      );
      nested.cause = new Error("internal");
      err.addError("age", nested);

      const body = sent(err);

      assert.equal(body.name, "ValidationError");
      assert.equal(body.errors.age.name, "CastError");
      assert.equal(body.errors.age.path, "age");
      assert.ok(!("reason" in body.errors.age));
      assert.ok(!("cause" in body.errors.age));
      assertNoStack(body);
    });

    it("removes stacks at any depth", () => {
      const err = new Error("An error occurred");
      err.details = {
        code: 42,
        inner: [{ stack: "Error: x\n    at /srv/app/index.js:1:1", ok: true }],
      };

      assert.deepEqual(sent(err), {
        message: "An error occurred",
        name: "Error",
        details: { code: 42, inner: [{ ok: true }] },
      });
    });
  });
});
