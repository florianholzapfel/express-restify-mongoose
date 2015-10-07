var sinon = require('sinon')

describe('onError', function () {
  var onError = require('../../../lib/middleware/onError')

  var res = {
    sendStatus: function () {
      return this
    },
    send: function () {}
  }

  var sendStatus = sinon.spy(res, 'sendStatus')
  var send = sinon.spy(res, 'send')
  var next = sinon.spy()

  afterEach(function () {
    sendStatus.reset()
    send.reset()
    next.reset()
  })

  it('with express', function () {
    var err = new Error('An error occurred')
    err.statusCode = 400

    onError(true)(err, {}, res, next)

    sinon.assert.calledOnce(sendStatus)
    sinon.assert.calledWithExactly(sendStatus, 400)
    sinon.assert.notCalled(send)
    sinon.assert.notCalled(next)
  })

  it('with restify', function () {
    var err = new Error('An error occurred')
    err.statusCode = 400

    onError(false)(err, {}, res, next)

    sinon.assert.calledOnce(send)
    sinon.assert.calledWithExactly(send, 400, 'Bad Request')
    sinon.assert.notCalled(sendStatus)
    sinon.assert.notCalled(next)
  })
})
