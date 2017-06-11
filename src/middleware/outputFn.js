module.exports = function (isExpress) {
  return function output (req, res) {
    if (!isExpress) {
      return res.send(req.erm.statusCode, req.erm.result)
    }

    if (req.erm.result) {
      return res.status(req.erm.statusCode).json(req.erm.result)
    }

    return res.sendStatus(req.erm.statusCode)
  }
}
