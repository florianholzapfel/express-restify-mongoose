'use strict'

var sinon = require('sinon')
var prepareOutput = require('../../lib/middleware/prepareOutput')

describe('prepareOutput', function () {
  var onError = sinon.spy()
  var outputFn = sinon.spy()
  var next = sinon.spy()

  afterEach(function () {
    onError.reset()
    outputFn.reset()
    next.reset()
  })

  it('calls outputFn with default options and no postMiddleware', function () {
    var req = {
      _erm: {}
    }

    var options = {
      onError: onError,
      outputFn: outputFn
    }

    prepareOutput(options)(req, {}, next)

    sinon.assert.calledOnce(outputFn)
    sinon.assert.calledWithExactly(outputFn, req, {}, {
      result: undefined,
      statusCode: undefined
    })
    sinon.assert.notCalled(onError)
    sinon.assert.notCalled(next)
  })

  it('calls outputFn with default options and postMiddleware', function () {
    var req = {
      _erm: {
        result: {
          foo: 'bar'
        },
        statusCode: 200
      }
    }

    var postMiddleware1 = sinon.stub().yields()

    var options = {
      onError: onError,
      outputFn: outputFn,
      postMiddleware: [postMiddleware1]
    }

    prepareOutput(options)(req, {}, next)

    sinon.assert.calledOnce(postMiddleware1)
    sinon.assert.calledOnce(outputFn)
    sinon.assert.calledWithExactly(outputFn, req, {}, {
      result: req._erm.result,
      statusCode: req._erm.statusCode
    })
    sinon.assert.notCalled(onError)
    sinon.assert.notCalled(next)
  })

  it('calls onError with default options and bad postMiddleware', function () {
    var req = {
      _erm: {}
    }

    var err = new Error('An error occurred')
    var postMiddleware1 = sinon.stub().yields(err)

    var options = {
      onError: onError,
      outputFn: outputFn,
      postMiddleware: [postMiddleware1]
    }

    prepareOutput(options)(req, {}, next)

    sinon.assert.calledOnce(postMiddleware1)
    sinon.assert.calledOnce(onError)
    sinon.assert.calledWithExactly(onError, err, req, {}, next)
    sinon.assert.notCalled(outputFn)
    sinon.assert.notCalled(next)
  })
})
