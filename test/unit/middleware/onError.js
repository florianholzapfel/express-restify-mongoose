var sinon = require('sinon')

describe('onError', function () {
  var onError = require('../../../lib/middleware/onError')

  var res = {
    setHeader: function () {},
    status: function () {
      return this
    },
    json: function () {},
    send: function () {}
  }

  var setHeader = sinon.spy(res, 'setHeader')
  var status = sinon.spy(res, 'status')
  var send = sinon.spy(res, 'send')
  var json = sinon.spy(res, 'json')
  var next = sinon.spy()

  var err = new Error('An error occurred')
  err.statusCode = 400

  afterEach(function () {
    setHeader.reset()
    status.reset()
    send.reset()
    json.reset()
    next.reset()
  })

  it('with express', function () {
    onError(true)(err, {}, res, next)

    sinon.assert.calledOnce(setHeader)
    sinon.assert.calledWithExactly(setHeader, 'Content-Type', 'application/json')
    sinon.assert.calledOnce(status)
    sinon.assert.calledWithExactly(status, err.statusCode)
    sinon.assert.calledOnce(json)
    sinon.assert.calledWithExactly(json, err)
    sinon.assert.notCalled(next)
  })

  it('with restify', function () {
    onError(false)(err, {}, res, next)

    sinon.assert.calledOnce(setHeader)
    sinon.assert.calledWithExactly(setHeader, 'Content-Type', 'application/json')
    sinon.assert.notCalled(status)
    sinon.assert.calledOnce(send)
    sinon.assert.calledWithExactly(send, err.statusCode, JSON.parse(JSON.stringify(err)))
    sinon.assert.notCalled(next)
  })
})
