module.exports = function (queryOptions) {
  return function (req, res, next) {
    queryOptions.current = {}

    for (var key in req.query) {
      if (queryOptions.protected.indexOf(key) >= 0) {
        queryOptions.current[key] = req.query[key]
      }
    }

    next()
  }
}
