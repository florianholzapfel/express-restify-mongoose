module.exports = function () {
  return function (err, req, res, next) {
    var errorString = JSON.stringify(err)

    res.setHeader('Content-Type', 'application/json')

    if (res.status) {
      res.status(err.statusCode).send(errorString)
    } else {
      res.send(err.statusCode, errorString)
    }
  }
}
