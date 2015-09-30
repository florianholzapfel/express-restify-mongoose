var async = require('async')

module.exports = function (options) {
  return function (req, res, next) {
    var data = {
      result: req._ermResult,
      statusCode: req._ermStatusCode
    }

    var postMiddleware

    switch (req.method.toLowerCase()) {
      case 'get':
        postMiddleware = options.postRead
        break
      case 'post':
        if (data.statusCode === 201) {
          postMiddleware = options.postCreate
        } else {
          postMiddleware = options.postUpdate
        }
        break
      case 'put':
        postMiddleware = options.postUpdate
        break
      case 'delete':
        postMiddleware = options.postDelete
        break
    }

    if (!postMiddleware) {
      postMiddleware = []
    }

    async.eachSeries(postMiddleware, function (middleware, cb) {
      middleware(req, res, cb, data)
    }, function (err) {
      if (err) {
        return options.onError(err, req, res, next)
      }

      options.outputFn(req, res, data)
    })
  }
}
