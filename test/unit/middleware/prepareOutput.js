'use strict'

const sinon = require('sinon')

describe('prepareOutput', () => {
  const prepareOutput = require('../../../src/middleware/prepareOutput')

  let onError = sinon.spy()
  let outputFn = sinon.spy()
  let outputFnPromise = sinon.spy(() => {
    return Promise.resolve()
  })
  let postProcess = sinon.spy()
  let next = sinon.spy()

  afterEach(() => {
    onError.reset()
    outputFn.reset()
    outputFnPromise.reset()
    postProcess.reset()
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

  it('calls outputFn with default options and no post* middleware and next when restify option', () => {
    let req = {
      method: 'GET',
      erm: {}
    }

    let options = {
      restify: true,
      onError: onError,
      outputFn: outputFn
    }

    prepareOutput(options)(req, {}, next)

    sinon.assert.calledOnce(outputFn)
    sinon.assert.calledWithExactly(outputFn, req, {})
    sinon.assert.notCalled(onError)
    sinon.assert.calledOnce(next)
  })

  it('calls outputFn with default options and no post* middleware (async)', (done) => {
    let req = {
      method: 'GET',
      erm: {}
    }

    let options = {
      onError: onError,
      outputFn: outputFnPromise
    }

    prepareOutput(options)(req, {}, next)

    outputFnPromise().then(() => {
      sinon.assert.calledTwice(outputFnPromise)
      sinon.assert.calledWithExactly(outputFnPromise, req, {})
      sinon.assert.notCalled(onError)
      sinon.assert.notCalled(next)
      done()
    })

  })

  it('calls outputFn with default options and no post* middleware and next when restify option (async)', (done) => {
    let req = {
      method: 'GET',
      erm: {}
    }

    let options = {
      restify: true,
      onError: onError,
      outputFn: outputFnPromise
    }

    prepareOutput(options)(req, {}, next)

    outputFnPromise().then(() => {
      sinon.assert.calledTwice(outputFnPromise)
      sinon.assert.calledWithExactly(outputFnPromise, req, {})
      sinon.assert.notCalled(onError)
      sinon.assert.calledOnce(next)
      done()
    });
  })

  it('calls postProcess with default options and no post* middleware', () => {
    let req = {
      method: 'GET',
      erm: {}
    }

    let options = {
      onError: onError,
      outputFn: outputFn,
      postProcess: postProcess
    }

    prepareOutput(options)(req, {}, next)

    sinon.assert.calledOnce(outputFn)
    sinon.assert.calledWithExactly(outputFn, req, {})
    sinon.assert.calledOnce(postProcess)
    sinon.assert.calledWithExactly(postProcess, req, {})
    sinon.assert.notCalled(onError)
    sinon.assert.notCalled(next)
  })

  it('calls postProcess with default options and no post* middleware and next when restify option', () => {
    let req = {
      method: 'GET',
      erm: {}
    }

    let options = {
      restify: true,
      onError: onError,
      outputFn: outputFn,
      postProcess: postProcess
    }

    prepareOutput(options)(req, {}, next)

    sinon.assert.calledOnce(outputFn)
    sinon.assert.calledWithExactly(outputFn, req, {})
    sinon.assert.calledOnce(postProcess)
    sinon.assert.calledWithExactly(postProcess, req, {})
    sinon.assert.notCalled(onError)
    sinon.assert.calledOnce(next)
  })

  it('calls postProcess with default options and no post* middleware (async)', (done) => {
    let req = {
      method: 'GET',
      erm: {}
    }

    let options = {
      onError: onError,
      outputFn: outputFnPromise,
      postProcess: postProcess
    }

    prepareOutput(options)(req, {}, next)

    outputFnPromise().then(() => {
      sinon.assert.calledTwice(outputFnPromise)
      sinon.assert.calledWithExactly(outputFnPromise, req, {})
      sinon.assert.calledOnce(postProcess)
      sinon.assert.calledWithExactly(postProcess, req, {})
      sinon.assert.notCalled(onError)
      sinon.assert.notCalled(next)
      done()
    });
  })

  it('calls postProcess with default options and no post* middleware and next with restify option (async)', (done) => {
    let req = {
      method: 'GET',
      erm: {}
    }

    let options = {
      restify: true,
      onError: onError,
      outputFn: outputFnPromise,
      postProcess: postProcess
    }

    prepareOutput(options)(req, {}, next)

    outputFnPromise().then(() => {
      sinon.assert.calledTwice(outputFnPromise)
      sinon.assert.calledWithExactly(outputFnPromise, req, {})
      sinon.assert.calledOnce(postProcess)
      sinon.assert.calledWithExactly(postProcess, req, {})
      sinon.assert.notCalled(onError)
      sinon.assert.calledOnce(next)
      done()
    });
  })
})
