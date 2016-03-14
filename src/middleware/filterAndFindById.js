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
          let err = new Error(http.STATUS_CODES[404])
          err.statusCode = 404
          return options.onError(err, req, res, next)
        }

        req.erm.document = doc

        next()
      }, errorHandler(req, res, next))
    })
  }
}
