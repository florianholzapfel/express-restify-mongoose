const sinon = require('sinon')

describe('onError', () => {
  const onError = require('../../../lib/middleware/onError')

  let res = {
    setHeader: () => {},
    status: function () {
      return this
    },
    json: () => {},
    send: () => {}
  }

  let setHeader = sinon.spy(res, 'setHeader')
  let status = sinon.spy(res, 'status')
  let send = sinon.spy(res, 'send')
  let json = sinon.spy(res, 'json')
  let next = sinon.spy()

  let err = new Error('An error occurred')
  err.statusCode = 400

  afterEach(() => {
    setHeader.reset()
    status.reset()
    send.reset()
    json.reset()
    next.reset()
  })

  it('with express', () => {
    onError(true)(err, {}, res, next)

    sinon.assert.calledOnce(setHeader)
    sinon.assert.calledWithExactly(setHeader, 'Content-Type', 'application/json')
    sinon.assert.calledOnce(status)
    sinon.assert.calledWithExactly(status, err.statusCode)
    sinon.assert.calledOnce(json)
    sinon.assert.calledWithExactly(json, err)
    sinon.assert.notCalled(next)
  })

  it('with restify', () => {
    onError(false)(err, {}, res, next)

    sinon.assert.calledOnce(setHeader)
    sinon.assert.calledWithExactly(setHeader, 'Content-Type', 'application/json')
    sinon.assert.notCalled(status)
    sinon.assert.calledOnce(send)
    sinon.assert.calledWithExactly(send, err.statusCode, JSON.parse(JSON.stringify(err)))
    sinon.assert.notCalled(next)
  })
})
