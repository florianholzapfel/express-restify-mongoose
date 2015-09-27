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
    it('sends no data defaults to sending 200', function () {
      outputFn(true)({}, res)

      sinon.assert.calledOnce(sendStatus)
      sinon.assert.calledWithExactly(sendStatus, 200)
      sinon.assert.notCalled(status)
      sinon.assert.notCalled(json)
      sinon.assert.notCalled(send)
    })

    it('sends data and defaults to status code 200', function () {
      var data = {
        result: {
          foo: 'bar'
        }
      }

      outputFn(true)({}, res, data)

      sinon.assert.calledOnce(status)
      sinon.assert.calledWithExactly(status, 200)
      sinon.assert.calledOnce(json)
      sinon.assert.calledWithExactly(json, data.result)
      sinon.assert.notCalled(sendStatus)
      sinon.assert.notCalled(send)
    })

    it('sends data and status code', function () {
      var data = {
        statusCode: 201,
        result: {
          foo: 'bar'
        }
      }

      outputFn(true)({}, res, data)

      sinon.assert.calledOnce(status)
      sinon.assert.calledWithExactly(status, data.statusCode)
      sinon.assert.calledOnce(json)
      sinon.assert.calledWithExactly(json, data.result)
      sinon.assert.notCalled(sendStatus)
      sinon.assert.notCalled(send)
    })
  })

  describe('restify', function () {
    it('sends no data defaults to sending 200', function () {
      outputFn(false)({}, res)

      sinon.assert.calledOnce(send)
      sinon.assert.calledWithExactly(send, 200, undefined)
      sinon.assert.notCalled(sendStatus)
      sinon.assert.notCalled(status)
      sinon.assert.notCalled(json)
    })

    it('sends data and defaults to status code 200', function () {
      var data = {
        result: {
          foo: 'bar'
        }
      }

      outputFn(false)({}, res, data)

      sinon.assert.calledOnce(send)
      sinon.assert.calledWithExactly(send, 200, data.result)
      sinon.assert.notCalled(sendStatus)
      sinon.assert.notCalled(status)
      sinon.assert.notCalled(json)
    })

    it('sends data and status code', function () {
      var data = {
        statusCode: 201,
        result: {
          foo: 'bar'
        }
      }

      outputFn(false)({}, res, data)

      sinon.assert.calledOnce(send)
      sinon.assert.calledWithExactly(send, data.statusCode, data.result)
      sinon.assert.notCalled(sendStatus)
      sinon.assert.notCalled(status)
      sinon.assert.notCalled(json)
    })
  })
})
