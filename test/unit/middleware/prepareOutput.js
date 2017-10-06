'use strict'

const sinon = require('sinon')

describe('prepareOutput', () => {
  const prepareOutput = require('../../../src/middleware/prepareOutput')

  let onError = sinon.spy()
  let outputFn = sinon.spy()
  let next = sinon.spy()

  afterEach(() => {
    onError.reset()
    outputFn.reset()
    next.reset()
  })

  it('calls outputFn with default options and no post* middleware', () => {
    let req = {
      method: 'GET',
      erm: {}
    }

    let options = {
      onError: onError,
      outputFn: outputFn
    }

    prepareOutput(options)(req, {}, next)

    sinon.assert.calledOnce(outputFn)
    sinon.assert.calledWithExactly(outputFn, req, {})
    sinon.assert.notCalled(onError)
    sinon.assert.notCalled(next)
  })

  it('calls outputFn with default options and postCreate middleware', () => {
    let req = {
      erm: {
        result: {
          name: 'Bob'
        },
        statusCode: 201
      },
      method: 'POST'
    }

    let postCreate = sinon.stub().yields()

    let options = {
      onError: onError,
      outputFn: outputFn,
      postCreate: [postCreate]
    }

    prepareOutput(options)(req, {}, next)

    sinon.assert.calledOnce(postCreate)
    sinon.assert.calledOnce(outputFn)
    sinon.assert.calledWithExactly(outputFn, req, {})
    sinon.assert.notCalled(onError)
    sinon.assert.notCalled(next)
  })

  it('calls outputFn with default options and postRead middleware', () => {
    let req = {
      erm: {
        result: {
          name: 'Bob'
        },
        statusCode: 200
      },
      method: 'GET'
    }

    let postRead = sinon.stub().yields()

    let options = {
      onError: onError,
      outputFn: outputFn,
      postRead: [postRead]
    }

    prepareOutput(options)(req, {}, next)

    sinon.assert.calledOnce(postRead)
    sinon.assert.calledOnce(outputFn)
    sinon.assert.calledWithExactly(outputFn, req, {})
    sinon.assert.notCalled(onError)
    sinon.assert.notCalled(next)
  })

  it('calls outputFn with default options and postUpdate middleware', () => {
    let req = {
      erm: {
        result: {
          name: 'Bob'
        },
        statusCode: 200
      },
      method: 'POST'
    }

    let postUpdate = sinon.stub().yields()

    let options = {
      onError: onError,
      outputFn: outputFn,
      postUpdate: [postUpdate]
    }

    prepareOutput(options)(req, {}, next)

    sinon.assert.calledOnce(postUpdate)
    sinon.assert.calledOnce(outputFn)
    sinon.assert.calledWithExactly(outputFn, req, {})
    sinon.assert.notCalled(onError)
    sinon.assert.notCalled(next)
  })

  it('calls outputFn with default options and postUpdate middleware', () => {
    let req = {
      erm: {
        result: {
          name: 'Bob'
        },
        statusCode: 200
      },
      method: 'PUT'
    }

    let postUpdate = sinon.stub().yields()

    let options = {
      onError: onError,
      outputFn: outputFn,
      postUpdate: [postUpdate]
    }

    prepareOutput(options)(req, {}, next)

    sinon.assert.calledOnce(postUpdate)
    sinon.assert.calledOnce(outputFn)
    sinon.assert.calledWithExactly(outputFn, req, {})
    sinon.assert.notCalled(onError)
    sinon.assert.notCalled(next)
  })

  it('calls outputFn with default options and postDelete middleware', () => {
    let req = {
      erm: {
        result: {
          name: 'Bob'
        },
        statusCode: 204
      },
      method: 'DELETE'
    }

    let postDelete = sinon.stub().yields()

    let options = {
      onError: onError,
      outputFn: outputFn,
      postDelete: [postDelete]
    }

    prepareOutput(options)(req, {}, next)

    sinon.assert.calledOnce(postDelete)
    sinon.assert.calledOnce(outputFn)
    sinon.assert.calledWithExactly(outputFn, req, {})
    sinon.assert.notCalled(onError)
    sinon.assert.notCalled(next)
  })

  it('calls onError with default options and bad postRead middleware', () => {
    let req = {
      erm: {},
      method: 'GET',
      params: {}
    }

    let err = new Error('An error occurred')
    let postRead = sinon.stub().yields(err)

    let options = {
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
