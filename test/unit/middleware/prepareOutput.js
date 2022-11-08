"use strict";

const sinon = require("sinon");

describe("prepareOutput", () => {
  const prepareOutput = require("../../../src/middleware/prepareOutput");

  let onError = sinon.spy();
  let outputFn = sinon.spy();
  let outputFnPromise = sinon.spy(() => {
    return Promise.resolve();
  });
  let postProcess = sinon.spy();
  let next = sinon.spy();

  afterEach(() => {
    onError.resetHistory();
    outputFn.resetHistory();
    outputFnPromise.resetHistory();
    next.resetHistory();
  });

  it("calls outputFn with default options and no post* middleware", () => {
    let req = {
      method: "GET",
      erm: {},
    };

    let options = {
      onError: onError,
      outputFn: outputFn,
    };

    prepareOutput(options)(req, {}, next);

    sinon.assert.calledOnce(outputFn);
    sinon.assert.calledWithExactly(outputFn, req, {});
    sinon.assert.notCalled(onError);
    sinon.assert.notCalled(next);
  });

  it("calls outputFn with default options and no post* middleware (async)", () => {
    let req = {
      method: "GET",
      erm: {},
    };

    let options = {
      onError: onError,
      outputFn: outputFnPromise,
    };

    prepareOutput(options)(req, {}, next);

    sinon.assert.calledOnce(outputFnPromise);
    sinon.assert.calledWithExactly(outputFnPromise, req, {});
    sinon.assert.notCalled(onError);
    sinon.assert.notCalled(next);
  });

  it("calls postProcess with default options and no post* middleware", () => {
    let req = {
      method: "GET",
      erm: {},
    };

    let options = {
      onError: onError,
      outputFn: outputFn,
      postProcess: postProcess,
    };

    prepareOutput(options)(req, {}, next);

    sinon.assert.calledOnce(outputFn);
    sinon.assert.calledWithExactly(outputFn, req, {});
    sinon.assert.calledOnce(postProcess);
    sinon.assert.calledWithExactly(postProcess, req, {});
    sinon.assert.notCalled(onError);
    sinon.assert.notCalled(next);
  });

  it("calls postProcess with default options and no post* middleware (async outputFn)", () => {
    let req = {
      method: "GET",
      erm: {},
    };

    let options = {
      onError: onError,
      outputFn: outputFnPromise,
      postProcess: postProcess,
    };

    prepareOutput(options)(req, {}, next);

    sinon.assert.calledOnce(outputFnPromise);
    sinon.assert.calledWithExactly(outputFnPromise, req, {});
    sinon.assert.calledOnce(postProcess);
    sinon.assert.calledWithExactly(postProcess, req, {});
    sinon.assert.notCalled(onError);
    sinon.assert.notCalled(next);
  });
});
