var async = require('async')

module.exports = function (options) {
  return function (req, res, next) {
    var data = {
      result: req._erm.result,
      statusCode: req._erm.statusCode
    }

    async.eachSeries(options.postMiddleware, function (middleware, cb) {
      middleware(req, res, cb, data)
    }, function (err) {
      if (err) {
        return options.onError(err, req, res, next)
      }

      options.outputFn(req, res, data)
    })
  }
}
