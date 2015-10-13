var http = require('http')

module.exports = function (model, options) {
  return function (req, res, next) {
    if (!req.params.id) {
      return next()
    }

    options.contextFilter(model, req, function (filteredContext) {
      var byId = {}
      byId[options.idProperty] = req.params.id

      filteredContext.findOne().and(byId).lean(false).exec(function (err, doc) {
        if (err) {
          err.statusCode = 400
          return options.onError(err, req, res, next)
        }

        if (!doc) {
          err = new Error(http.STATUS_CODES[404])
          err.statusCode = 404
          return options.onError(err, req, res, next)
        }

        req.erm.document = doc

        next()
      })
    })
  }
}
