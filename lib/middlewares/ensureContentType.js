var http = require('http')

module.exports = function () {
  return function ensureContentType (req, res, next) {
    var ct = req.headers['content-type']
    var err

    if (!ct) {
      err = new Error(http.STATUS_CODES[400])
      err.description = 'missing_content_type'
      err.statusCode = 400
      return next(err)
    }

    if (ct.indexOf('application/json') === -1) {
      err = new Error(http.STATUS_CODES[400])
      err.description = 'invalid_content_type'
      err.statusCode = 400
      return next(err)
    }

    next()
  }
}
