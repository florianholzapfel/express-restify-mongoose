'use strict'

module.exports = {
  access: function (accessFn) {
    return function (req, res, next) {
      var handler = function (err, access) {
        if (err) {
          return next(err)
        }

        if (['public', 'private', 'protected'].indexOf(access) < 0) {
          throw new Error('Unsupported access, must be "private", "protected" or "public"')
        }

        req.access = access
        next()
      }

      if (accessFn.length > 1) {
        accessFn(req, handler)
      } else {
        handler(null, accessFn(req))
      }
    }
  }
}
