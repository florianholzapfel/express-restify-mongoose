'use strict'

module.exports = function (isExpress) {
  return function output (req, res) {
    if (isExpress) {
      if (req.erm.result) {
        res.status(req.erm.statusCode).json(req.erm.result)
      } else {
        res.sendStatus(req.erm.statusCode)
      }
    } else {
      res.send(req.erm.statusCode, req.erm.result)
    }
  }
}
