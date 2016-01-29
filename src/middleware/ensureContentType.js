import * as http from 'http'

module.exports = function (options) {
  return function ensureContentType (req, res, next) {
    const ct = req.headers['content-type']

    if (!ct) {
      let err = new Error(http.STATUS_CODES[400])
      err.description = 'missing_content_type'
      err.statusCode = 400
      return options.onError(err, req, res, next)
    }

    if (ct.indexOf('application/json') === -1) {
      let err = new Error(http.STATUS_CODES[400])
      err.description = 'invalid_content_type'
      err.statusCode = 400
      return options.onError(err, req, res, next)
    }

    next()
  }
}
