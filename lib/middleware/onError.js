var http = require('http')

module.exports = function (isExpress) {
  return function (err, req, res, next) {
    err.statusCode = err.statusCode || 500

    if (isExpress) {
      res.sendStatus(err.statusCode)
    } else {
      res.send(err.statusCode, http.STATUS_CODES[err.statusCode])
    }
  }
}
