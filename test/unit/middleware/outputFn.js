import sinon from "sinon";
import { getOutputFnHandler } from "../../../src/middleware/outputFn";

describe("outputFn", () => {
  let res = {
    sendStatus: () => undefined,
    status: function () {
      return this;
    },
    json: () => undefined,
    send: () => undefined,
  };

  let sendStatus = sinon.spy(res, "sendStatus");
  let status = sinon.spy(res, "status");
  let json = sinon.spy(res, "json");
  let send = sinon.spy(res, "send");

  afterEach(() => {
    sendStatus.resetHistory();
    status.resetHistory();
    json.resetHistory();
    send.resetHistory();
  });

  describe("express", () => {
    it("sends status code and message", () => {
      getOutputFnHandler(true)(
        {
          erm: {
            statusCode: 200,
          },
        },
        res
      );

      sinon.assert.calledOnce(sendStatus);
      sinon.assert.calledWithExactly(sendStatus, 200);
      sinon.assert.notCalled(status);
      sinon.assert.notCalled(json);
      sinon.assert.notCalled(send);
    });

    it("sends data and status code", () => {
      let req = {
        erm: {
          statusCode: 201,
          result: {
            name: "Bob",
          },
        },
      };

      getOutputFnHandler(true)(req, res);

      sinon.assert.calledOnce(status);
      sinon.assert.calledWithExactly(status, 201);
      sinon.assert.calledOnce(json);
      sinon.assert.calledWithExactly(json, {
        name: "Bob",
      });
      sinon.assert.notCalled(sendStatus);
      sinon.assert.notCalled(send);
    });
  });

  describe("restify", () => {
    it("sends status code", () => {
      getOutputFnHandler(false)(
        {
          erm: {
            statusCode: 200,
          },
        },
        res
      );

      sinon.assert.calledOnce(send);
      sinon.assert.calledWithExactly(send, 200, undefined);
      sinon.assert.notCalled(sendStatus);
      sinon.assert.notCalled(status);
      sinon.assert.notCalled(json);
    });

    it("sends data and status code", () => {
      let req = {
        erm: {
          statusCode: 201,
          result: {
            name: "Bob",
          },
        },
      };

      getOutputFnHandler(false)(req, res);

      sinon.assert.calledOnce(send);
      sinon.assert.calledWithExactly(send, 201, {
        name: "Bob",
      });
      sinon.assert.notCalled(sendStatus);
      sinon.assert.notCalled(status);
      sinon.assert.notCalled(json);
    });
  });
});
