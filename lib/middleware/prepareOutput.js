var async = require('async')

module.exports = function (options) {
  return function (req, res, next) {
    var postMiddleware

    switch (req.method.toLowerCase()) {
      case 'get':
        postMiddleware = options.postRead
        break
      case 'post':
        if (req.erm.statusCode === 201) {
          postMiddleware = options.postCreate
        } else {
          postMiddleware = options.postUpdate
        }
        break
      case 'put':
      case 'patch':
        postMiddleware = options.postUpdate
        break
      case 'delete':
        postMiddleware = options.postDelete
        break
    }

    async.eachSeries(postMiddleware, function (middleware, cb) {
      middleware(req, res, cb)
    }, function (err) {
      if (err) {
        return options.onError(err, req, res, next)
      }

      options.outputFn(req, res, {
        result: req.erm.result,
        statusCode: req.erm.statusCode
      })

      if (options.postProcess) {
        options.postProcess(req, res, next)
      }
    })
  }
}
