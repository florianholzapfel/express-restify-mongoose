'use strict'

const serializeError = require('serialize-error')

module.exports = function (isExpress) {
  return function (err, req, res, next) {
    const serializedErr = serializeError(err)

    delete serializedErr.stack

    if (serializedErr.errors) {
      for (let key in serializedErr.errors) {
        delete serializedErr.errors[key].reason
        delete serializedErr.errors[key].stack
      }
    }

    res.setHeader('Content-Type', 'application/json')

    if (isExpress) {
      res.status(req.erm.statusCode).send(serializedErr)
    } else {
      res.send(req.erm.statusCode, serializedErr)
    }
  }
}
