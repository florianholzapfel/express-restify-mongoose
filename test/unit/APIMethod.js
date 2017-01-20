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
function doOperation (ermInstance, req) {
  return operation(req.shouldSucceed)
    .then(result => {
      return ermInstance.set('result', result)
    })
}

/**
 * An APIMethod constructed using the operation
 * @type {APIMethod}
 */
const api = new APIMethod(doOperation)

/**
 * Given an onError() handler, returns a fake ERMOperation with the supplied error handler
 * @param {function(err, req, res, next): void} onError function(): null
 * @return {ERMOperation}
 */
function fakeERM (onError = _.noop) {
  return new ERMOperation({
    options: { onError: onError },

    // Add required fields so it won't complain
    model: Object.create(require('mongoose').Model),
    excludedMap: {}
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
    err => {
      console.log(err)
      done(new Error('should not call the onError() handler'))
    }
  )
}

/**
 * Given a value to supply to the operation, returns a mocked Express request
 * object that has the value in the correct place.
 *
 * Also attaches the initial ERM state to the request for use by middleware.
 *
 * @param {*} shouldSucceed - whether the operation should succeed
 * @param {ERMOperation} initialState -
 * @return {{}}
 */
function fakeRequest (shouldSucceed, initialState) {
  return {
    params: {},
    query: {},
    shouldSucceed: shouldSucceed,
    erm: { model: initialState.model },
    _ermOptions: initialState.options,
    _ermExcludedMap: initialState.excludedMap
  }
}

describe('APIMethod', () => {
  describe('doOperation', () => {
    it('returns the function passed to the constructor', () => {
      assert.strictEqual(api.doOperation, doOperation)
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

      const req = fakeRequest(true, erm)

      middleware(req, {}, () => {
        done()
      })
    })

    it('stores the result of the operation on the request when the operation resolves', done => {
      const erm = failIfErrorHandlerCalled(done)
      const middleware = api.getMiddleware(erm)

      const shouldSucceed = 'success'
      const req = fakeRequest(shouldSucceed, erm)

      middleware(req, {}, () => {
        assert.strictEqual(req.erm.result, shouldSucceed)
        done()
      })
    })

    it('calls the error handler when the operation fails', done => {
      const erm = fakeERM((err, req, res, next) => {
        assert.ok(_.isEqual(err, new Error('Did not succeed')))
        done()
      })
      const middleware = api.getMiddleware(erm)

      const req = fakeRequest(false, erm)

      middleware(req, {}, () => {
        done(new Error('should not call next()'))
      })
    })
  })
})
