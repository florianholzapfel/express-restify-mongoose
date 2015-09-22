var sinon = require('sinon')

describe('prepareOutput', function () {
  var prepareOutput = require('../../lib/middleware/prepareOutput')

  var onError = sinon.spy()
  var outputFn = sinon.spy()
  var next = sinon.spy()

  afterEach(function () {
    onError.reset()
    outputFn.reset()
    next.reset()
  })

  it('calls outputFn with default options and no postMiddleware', function () {
    var options = {
      onError: onError,
      outputFn: outputFn
    }

    prepareOutput(options)({}, {}, next)

    sinon.assert.calledOnce(outputFn)
    sinon.assert.calledWithExactly(outputFn, {}, {}, {
      result: undefined,
      statusCode: undefined
    })
    sinon.assert.notCalled(onError)
    sinon.assert.notCalled(next)
  })

  it('calls outputFn with default options and postMiddleware', function () {
    var req = {
      _ermResult: {
        foo: 'bar'
      },
      _ermStatusCode: 200
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
      result: req._ermResult,
      statusCode: req._ermStatusCode
    })
    sinon.assert.notCalled(onError)
    sinon.assert.notCalled(next)
  })

  it('calls onError with default options and bad postMiddleware', function () {
    var err = new Error('An error occurred')
    var postMiddleware1 = sinon.stub().yields(err)

    var options = {
      onError: onError,
      outputFn: outputFn,
      postMiddleware: [postMiddleware1]
    }

    prepareOutput(options)({}, {}, next)

    sinon.assert.calledOnce(postMiddleware1)
    sinon.assert.calledOnce(onError)
    sinon.assert.calledWithExactly(onError, err, {}, {}, next)
    sinon.assert.notCalled(outputFn)
    sinon.assert.notCalled(next)
  })
})
