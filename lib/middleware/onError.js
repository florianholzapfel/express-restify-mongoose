module.exports = function (isExpress) {
  return function (err, req, res, next) {
    res.setHeader('Content-Type', 'application/json')

    if (isExpress) {
      res.status(err.statusCode).json(err)
    } else {
      res.send(err.statusCode, JSON.parse(JSON.stringify(err)))
    }
  }
}
