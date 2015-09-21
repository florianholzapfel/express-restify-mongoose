var _ = require('lodash')

module.exports = function (isExpress) {
  return function output (req, res, data) {
    data = _.defaults(data || {}, {
      statusCode: 200
    })

    if (isExpress) {
      if (data.result) {
        res.status(data.statusCode).json(data.result)
      } else {
        res.sendStatus(data.statusCode)
      }
    } else {
      res.send(data.statusCode, data.result)
    }
  }
}
