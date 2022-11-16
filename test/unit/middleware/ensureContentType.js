import assert from "assert";
import sinon from "sinon";
import { getEnsureContentTypeHandler } from "../../../dist/middleware/ensureContentType.js";

describe("ensureContentType", () => {
  let onError = sinon.spy();
  let next = sinon.spy();

  afterEach(() => {
    onError.resetHistory();
    next.resetHistory();
  });

  it("calls next with an error (missing_content_type)", () => {
    let req = {
      erm: {},
      headers: {},
      params: {},
    };

    getEnsureContentTypeHandler({ onError })(req, {}, next);

    sinon.assert.calledOnce(onError);
    sinon.assert.calledWithExactly(
      onError,
      sinon.match.instanceOf(Error) /*new Error('missing_content_type')*/,
      req,
      {},
      next
    );
    sinon.assert.notCalled(next);
    assert.equal(req.access, undefined);
  });

  it("calls next with an error (invalid_content_type)", () => {
    let req = {
      erm: {},
      headers: {
        "content-type": "invalid/type",
      },
      params: {},
    };

    getEnsureContentTypeHandler({ onError })(req, {}, next);

    sinon.assert.calledOnce(onError);
    sinon.assert.calledWithExactly(
      onError,
      sinon.match.instanceOf(Error) /*new Error('invalid_content_type')*/,
      req,
      {},
      next
    );
    sinon.assert.notCalled(next);
    assert.equal(req.access, undefined);
  });

  it("calls next", () => {
    let req = {
      headers: {
        "content-type": "application/json",
      },
      params: {},
    };

    getEnsureContentTypeHandler({ onError })(req, {}, next);

    sinon.assert.calledOnce(next);
    sinon.assert.calledWithExactly(next);
  });
});
