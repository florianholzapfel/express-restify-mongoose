const assert = require('assert')
const _ = require('lodash')
const APIMethod = require('../../src/APIMethod')
const ERMOperation = require('../../src/ERMOperation')

/**
 * The Promise-based API operation we're going to use for the tests.
 * Given a value, resolves to the value if the value is truthy, or throws if the value is falsey.
 *
 * @param {*} shouldSucceed - whether or not the operation should succeed
 * @return {Promise}
 */
function operation (shouldSucceed) {
  return new Promise((resolve, reject) => {
    return shouldSucceed
      ? resolve(shouldSucceed)
      : reject(new Error('Did not succeed'))
  })
}

/**
 * Given an erm instance and a request, performs the Promise-based operation using the
 * "shouldSucceed" property of the request as the argument for the operation.
 *
 * @param {*?} ermInstance? - the erm instance (not used, but required for the function signature)
 * @param {Object} req - the request object
 * @param {*} req.shouldSucceed - whether or not the operation should succeed
 * @return {Promise}
 */
function doOperationWithRequest (ermInstance, req) {
  return operation(req.shouldSucceed)
    .then(result => {
      return {
        _result: result
      }
    })
}

/**
 * An APIMethod constructed using the operation
 * @type {APIMethod}
 */
const api = new APIMethod(operation, doOperationWithRequest)

/**
 * Given an onError() handler, returns a fake ERMOperation with the supplied error handler
 * @param {function(err, req, res, next): void} onError function(): null
 * @return {ERMOperation}
 */
function fakeERM (onError = _.noop) {
  return new ERMOperation({
    options: { onError: onError }
  })
}

/**
 * Given a test completion function, returns a fake ERM instance with an error handler that
 * fails the test if the error handler is called.
 *
 * @param {function} done - test completion callback
 * @return {ERMOperation}
 */
const failIfErrorHandlerCalled = done => {
  return fakeERM(
    () => done(new Error('should not call the onError() handler'))
  )
}

/**
 * Given a value to supply to the operation, returns a mocked Express request object that has
 * the value in the correct place.
 *
 * @param {*} shouldSucceed - whether the operation should succeed
 * @return {{params: {}, query: {}, shouldSucceed: *}}
 */
function fakeRequest (shouldSucceed) {
  return {
    params: {},
    query: {},
    shouldSucceed: shouldSucceed
  }
}

describe('APIMethod', () => {
  describe('doOperationWithRequest', () => {
    it('returns the function passed to the constructor', () => {
      assert.strictEqual(api.doOperationWithRequest, doOperationWithRequest)
    })
  })

  describe('operation', () => {
    it('returns the function passed to the constructor', () => {
      assert.strictEqual(api.operation, operation)
    })
  })

  describe('getMiddleware', () => {
    it('returns Express middleware', () => {
      const middleware = api.getMiddleware(fakeERM())
      assert.strictEqual(middleware.length, 3)
    })

    it('calls next when the operation resolves', done => {
      const erm = failIfErrorHandlerCalled(done)
      const middleware = api.getMiddleware(erm)

      const req = fakeRequest(true)

      middleware(req, {}, () => {
        done()
      })
    })

    it('stores the result of the operation on the request when the operation resolves', done => {
      const erm = failIfErrorHandlerCalled(done)
      const middleware = api.getMiddleware(erm)

      const shouldSucceed = 'success'
      const req = fakeRequest(shouldSucceed)

      middleware(req, {}, () => {
        assert.strictEqual(req._result, shouldSucceed)
        done()
      })
    })

    it('calls the error handler when the operation fails', done => {
      const erm = fakeERM((err, req, res, next) => {
        assert.ok(_.isEqual(err, new Error('Did not succeed')))
        done()
      })
      const middleware = api.getMiddleware(erm)

      const req = fakeRequest(false)

      middleware(req, {}, () => {
        done(new Error('should not call next()'))
      })
    })
  })
})
