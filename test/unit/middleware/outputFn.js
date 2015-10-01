var sinon = require('sinon')

describe('outputFn', function () {
  var outputFn = require('../../../lib/middleware/outputFn')

  var res = {
    sendStatus: function () {},
    status: function () {
      return this
    },
    json: function () {},
    send: function () {}
  }

  var sendStatus = sinon.spy(res, 'sendStatus')
  var status = sinon.spy(res, 'status')
  var json = sinon.spy(res, 'json')
  var send = sinon.spy(res, 'send')

  afterEach(function () {
    sendStatus.reset()
    status.reset()
    json.reset()
    send.reset()
  })

  describe('express', function () {
    it('sends status code and message', function () {
      outputFn(true)({
        erm: {
          statusCode: 200
        }
      }, res)

      sinon.assert.calledOnce(sendStatus)
      sinon.assert.calledWithExactly(sendStatus, 200)
      sinon.assert.notCalled(status)
      sinon.assert.notCalled(json)
      sinon.assert.notCalled(send)
    })

    it('sends data and status code', function () {
      var req = {
        erm: {
          statusCode: 201,
          result: {
            name: 'Bob'
          }
        }
      }

      outputFn(true)(req, res)

      sinon.assert.calledOnce(status)
      sinon.assert.calledWithExactly(status, 201)
      sinon.assert.calledOnce(json)
      sinon.assert.calledWithExactly(json, {
        name: 'Bob'
      })
      sinon.assert.notCalled(sendStatus)
      sinon.assert.notCalled(send)
    })
  })

  describe('restify', function () {
    it('sends status code', function () {
      outputFn(false)({
        erm: {
          statusCode: 200
        }
      }, res)

      sinon.assert.calledOnce(send)
      sinon.assert.calledWithExactly(send, 200, undefined)
      sinon.assert.notCalled(sendStatus)
      sinon.assert.notCalled(status)
      sinon.assert.notCalled(json)
    })

    it('sends data and status code', function () {
      var req = {
        erm: {
          statusCode: 201,
          result: {
            name: 'Bob'
          }
        }
      }

      outputFn(false)(req, res)

      sinon.assert.calledOnce(send)
      sinon.assert.calledWithExactly(send, 201, {
        name: 'Bob'
      })
      sinon.assert.notCalled(sendStatus)
      sinon.assert.notCalled(status)
      sinon.assert.notCalled(json)
    })
  })
})
