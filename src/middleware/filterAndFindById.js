'use strict'

const http = require('http')

module.exports = function (model, options) {
  const errorHandler = require('../errorHandler')(options)

  return function (req, res, next) {
    if (!req.params.id) {
      return next()
    }

    options.contextFilter(model, req, (filteredContext) => {
      filteredContext.findOne().and({
        [options.idProperty]: req.params.id
      }).lean(false).read(options.readPreference).exec().then((doc) => {
        if (!doc) {
          return errorHandler(req, res, next)(new Error(http.STATUS_CODES[404]))
        }

        req.erm.document = doc

        next()
      }, errorHandler(req, res, next))
    })
  }
}
