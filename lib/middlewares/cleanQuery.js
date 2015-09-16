module.exports = function (queryOptions) {
  return function (req, res, next) {
    queryOptions.current = {}
  
    for (var key in queryOptions.clean) {
      if (queryOptions.protected.indexOf(key) !== -1) {
        queryOptions.current[key] = queryOptions.clean[key]
      }
    }
  
    next()
  }
}
