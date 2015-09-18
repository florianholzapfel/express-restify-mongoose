module.exports = function (isExpress) {
  return function (err, req, res, next) {
    var errorString = JSON.stringify(err)

    res.setHeader('Content-Type', 'application/json')

    if (isExpress) {
      res.status(err.statusCode).send(errorString)
    } else {
      res.send(err.statusCode, errorString)
    }
  }
}
