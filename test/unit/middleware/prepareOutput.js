var sinon = require('sinon')

describe('prepareOutput', function () {
  var prepareOutput = require('../../../lib/middleware/prepareOutput')

  var onError = sinon.spy()
  var outputFn = sinon.spy()
  var next = sinon.spy()

  afterEach(function () {
    onError.reset()
    outputFn.reset()
    next.reset()
  })

  it('calls outputFn with default options and no post* middleware', function () {
    var req = {
      method: 'GET',
      erm: {}
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

  it('calls outputFn with default options and postCreate middleware', function () {
    var req = {
      erm: {
        result: {
          name: 'Bob'
        },
        statusCode: 201
      },
      method: 'POST'
    }

    var postCreate = sinon.stub().yields()

    var options = {
      onError: onError,
      outputFn: outputFn,
      postCreate: [postCreate]
    }

    prepareOutput(options)(req, {}, next)

    sinon.assert.calledOnce(postCreate)
    sinon.assert.calledOnce(outputFn)
    sinon.assert.calledWithExactly(outputFn, req, {}, {
      result: {
        name: 'Bob'
      },
      statusCode: 201
    })
    sinon.assert.notCalled(onError)
    sinon.assert.notCalled(next)
  })

  it('calls outputFn with default options and postRead middleware', function () {
    var req = {
      erm: {
        result: {
          name: 'Bob'
        },
        statusCode: 200
      },
      method: 'GET'
    }

    var postRead = sinon.stub().yields()

    var options = {
      onError: onError,
      outputFn: outputFn,
      postRead: [postRead]
    }

    prepareOutput(options)(req, {}, next)

    sinon.assert.calledOnce(postRead)
    sinon.assert.calledOnce(outputFn)
    sinon.assert.calledWithExactly(outputFn, req, {}, {
      result: {
        name: 'Bob'
      },
      statusCode: 200
    })
    sinon.assert.notCalled(onError)
    sinon.assert.notCalled(next)
  })

  it('calls outputFn with default options and postUpdate middleware', function () {
    var req = {
      erm: {
        result: {
          name: 'Bob'
        },
        statusCode: 200
      },
      method: 'POST'
    }

    var postUpdate = sinon.stub().yields()

    var options = {
      onError: onError,
      outputFn: outputFn,
      postUpdate: [postUpdate]
    }

    prepareOutput(options)(req, {}, next)

    sinon.assert.calledOnce(postUpdate)
    sinon.assert.calledOnce(outputFn)
    sinon.assert.calledWithExactly(outputFn, req, {}, {
      result: {
        name: 'Bob'
      },
      statusCode: 200
    })
    sinon.assert.notCalled(onError)
    sinon.assert.notCalled(next)
  })

  it('calls outputFn with default options and postUpdate middleware', function () {
    var req = {
      erm: {
        result: {
          name: 'Bob'
        },
        statusCode: 200
      },
      method: 'PUT'
    }

    var postUpdate = sinon.stub().yields()

    var options = {
      onError: onError,
      outputFn: outputFn,
      postUpdate: [postUpdate]
    }

    prepareOutput(options)(req, {}, next)

    sinon.assert.calledOnce(postUpdate)
    sinon.assert.calledOnce(outputFn)
    sinon.assert.calledWithExactly(outputFn, req, {}, {
      result: {
        name: 'Bob'
      },
      statusCode: 200
    })
    sinon.assert.notCalled(onError)
    sinon.assert.notCalled(next)
  })

  it('calls outputFn with default options and postDelete middleware', function () {
    var req = {
      erm: {
        result: {
          name: 'Bob'
        },
        statusCode: 204
      },
      method: 'DELETE'
    }

    var postDelete = sinon.stub().yields()

    var options = {
      onError: onError,
      outputFn: outputFn,
      postDelete: [postDelete]
    }

    prepareOutput(options)(req, {}, next)

    sinon.assert.calledOnce(postDelete)
    sinon.assert.calledOnce(outputFn)
    sinon.assert.calledWithExactly(outputFn, req, {}, {
      result: {
        name: 'Bob'
      },
      statusCode: 204
    })
    sinon.assert.notCalled(onError)
    sinon.assert.notCalled(next)
  })

  it('calls onError with default options and bad postRead middleware', function () {
    var req = {
      erm: {},
      method: 'GET'
    }

    var err = new Error('An error occurred')
    var postRead = sinon.stub().yields(err)

    var options = {
      onError: onError,
      outputFn: outputFn,
      postRead: [postRead]
    }

    prepareOutput(options)(req, {}, next)

    sinon.assert.calledOnce(postRead)
    sinon.assert.calledOnce(onError)
    sinon.assert.calledWithExactly(onError, err, req, {}, next)
    sinon.assert.notCalled(outputFn)
    sinon.assert.notCalled(next)
  })
})
