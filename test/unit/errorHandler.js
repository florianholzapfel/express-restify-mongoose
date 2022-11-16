import assert from "assert";
import mongoose from "mongoose";
import sinon from "sinon";
import { getErrorHandler } from "../../dist/errorHandler.js";

describe("errorHandler", () => {
  it("is a function", () => {
    assert.equal(typeof getErrorHandler, "function");
  });

  it("returns a function", () => {
    assert.equal(typeof getErrorHandler(), "function");
  });

  it("sets statusCode 400 and calls onError", () => {
    const options = {
      onError: sinon.spy(),
    };

    const req = {
      erm: {},
      params: {},
    };

    const err = new Error("Something went wrong");

    getErrorHandler(options)(err, req);

    sinon.assert.calledOnce(options.onError);
    assert.equal(req.erm.statusCode, 400);
  });

  it("sets statusCode 400 and calls onError", () => {
    const options = {
      onError: sinon.spy(),
      idProperty: "42",
    };

    const req = {
      erm: {},
      params: {
        id: "42",
      },
    };

    const err = new Error("Something went wrong");

    getErrorHandler(options)(err, req);

    sinon.assert.calledOnce(options.onError);
    assert.equal(req.erm.statusCode, 400);
  });

  it("sets statusCode 404 and calls onError", () => {
    const options = {
      onError: sinon.spy(),
      idProperty: "_id",
    };

    const req = {
      erm: {},
      params: {
        id: "42",
      },
    };

    const err = new mongoose.CastError("type", "42", "_id");

    getErrorHandler(options)(err, req);

    sinon.assert.calledOnce(options.onError);
    assert.equal(req.erm.statusCode, 404);
  });
});
