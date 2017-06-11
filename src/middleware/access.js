const Promise = require('bluebird')

/**
 * Returns Express middleware that calls the "access" function in options and adds the result to
 * the request object (as "req.access")
 *
 * The access function in options ("options.access") gets passed the request.
 *
 * @param {Object} options - erm options
 * @param {function(req: Object, done: function?)} options.access - tells us what the access level for this route is, based on the request
 * @return {function(req, res, next)}
 */
module.exports = function (options) {
  const errorHandler = require('../errorHandler')(options)

  return function (req, res, next) {
    // Returns a Promise whose fulfillment value is the access level for the request
    const getAccess = options.access.length > 1
      ? Promise.promisify(options.access) // options.access is async
      : Promise.method(options.access) // options.access is synchronous

    return getAccess(req)
      .then(access => {
        if (['public', 'private', 'protected'].indexOf(access) < 0) {
          return Promise.reject(new Error('Unsupported access, must be "private", "protected" or "public"'))
        }

        req.access = access
        return next()
      })
      .catch(err => {
        // Error was thrown by consumer code -- we pass the cause directly to the error handler.
        if (err.isOperational && err.cause) {
          return errorHandler(req, res, next)(err.cause)
        }

        return errorHandler(req, res, next)(err)
      })
  }
}
