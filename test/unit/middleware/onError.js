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
});
