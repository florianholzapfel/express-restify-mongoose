'use strict'

var http = require('http')

module.exports = {
  allow: function (prereq) {
    return function (req, res, next) {
      var handler = function (err, passed) {
        if (err) {
          return next(err)
        }

        if (!passed) {
          err = new Error(http.STATUS_CODES[403])
          err.statusCode = 403
          return next(err)
        }

        next()
      }

      if (prereq.length > 1) {
        prereq(req, handler)
      } else {
        handler(null, prereq(req))
      }
    }
  },
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
