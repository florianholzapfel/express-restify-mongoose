module.exports = function (options) {
  return function (req, res, next) {
    return function (err) {
      if (req.params.id && err.path === options.idProperty && err.name === 'CastError') {
        err.statusCode = 404
      } else {
        err.statusCode = 400
      }

      options.onError(err, req, res, next)
    }
  }
}
