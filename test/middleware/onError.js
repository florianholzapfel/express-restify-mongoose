var sinon = require('sinon')

describe('onError', function () {
  var onError = require('../../lib/middleware/onError')

  var res = {
    setHeader: function () {},
    status: function () {
      return this
    },
    send: function () {}
  }

  var setHeader = sinon.spy(res, 'setHeader')
  var status = sinon.spy(res, 'status')
  var send = sinon.spy(res, 'send')
  var next = sinon.spy()

  var err = new Error('An error occurred')
  err.statusCode = 400

  afterEach(function () {
    setHeader.reset()
    status.reset()
    send.reset()
    next.reset()
  })

  it('with express', function () {
    onError(true)(err, {}, res, next)

    sinon.assert.calledOnce(setHeader)
    sinon.assert.calledWithExactly(setHeader, 'Content-Type', 'application/json')
    sinon.assert.calledOnce(status)
    sinon.assert.calledWithExactly(status, err.statusCode)
    sinon.assert.calledOnce(send)
    sinon.assert.calledWithExactly(send, JSON.stringify(err))
    sinon.assert.notCalled(next)
  })

  it('with restify', function () {
    onError(false)(err, {}, res, next)

    sinon.assert.calledOnce(setHeader)
    sinon.assert.calledWithExactly(setHeader, 'Content-Type', 'application/json')
    sinon.assert.notCalled(status)
    sinon.assert.calledOnce(send)
    sinon.assert.calledWithExactly(send, err.statusCode, JSON.stringify(err))
    sinon.assert.notCalled(next)
  })
})
