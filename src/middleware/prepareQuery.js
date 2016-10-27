module.exports = function (options) {
  const prepareQueryAsPromise = require('../operations/prepareQuery')(options.allowRegex)
  const errorHandler = require('../errorHandler')(options)

  return function (req, res, next) {
    prepareQueryAsPromise(req.query)
      .then(queryOptions => {
        req._ermQueryOptions = queryOptions
        return next()
      })
      .catch(err => {
        return errorHandler(req, res, next)(err)
      })
  }
}
