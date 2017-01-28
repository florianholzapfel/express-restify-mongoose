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
    const handler = function (err, access) {
      if (err) {
        return process.nextTick(
          () => errorHandler(req, res, next)(err)
        )
      }

      if (['public', 'private', 'protected'].indexOf(access) < 0) {
        throw new Error('Unsupported access, must be "private", "protected" or "public"')
      }

      req.access = access
      next()
    }

    if (options.access.length > 1) {
      // The handler provided in options is async, so pass it the callback handler
      options.access(req, handler)
    } else {
      // The handler provided in options is synchronous
      handler(null, options.access(req))
    }
  }
}
