'use strict'

module.exports = function (options) {
  const errorHandler = require('../errorHandler')(options)

  return function (req, res, next) {
    const handler = function (err, access) {
      if (err) {
        return errorHandler(req, res, next)(err)
      }

      if (['public', 'private', 'protected'].indexOf(access) < 0) {
        throw new Error('Unsupported access, must be "private", "protected" or "public"')
      }

      req.access = access
      next()
    }

    if (options.access.length > 1) {
      options.access(req, handler)
    } else {
      handler(null, options.access(req))
    }
  }
}
