var _ = require('lodash')

module.exports = function (options) {
  function jsonQueryParser (key, value) {
    if (_.isString(value)) {
      if (value[0] === '~') { // parse RegExp
        return new RegExp(value.substr(1), 'i')
      } else if (value[0] === '>') {
        if (value[1] === '=') {
          return { $gte: value.substr(2) }
        } else {
          return { $gt: value.substr(1) }
        }
      } else if (value[0] === '<') {
        if (value[1] === '=') {
          return { $lte: value.substr(2) }
        } else {
          return { $lt: value.substr(1) }
        }
      } else if (value[0] === '!' && value[1] === '=') {
        return { $ne: value.substr(2) }
      } else if (value[0] === '=') {
        return { $eq: value.substr(1) }
      }
    } else if (_.isArray(value) && key[0] !== '$') {
      return { $in: value }
    }

    return value
  }

  return function (req, res, next) {
    var whitelist = ['distinct', 'limit', 'populate', 'query', 'select', 'skip', 'sort']

    req._ermQueryOptions = {}

    for (var key in req.query) {
      if (whitelist.indexOf(key) === -1) {
        continue
      }

      if (key === 'query') {
        try {
          req._ermQueryOptions[key] = JSON.parse(req.query[key], jsonQueryParser)
        } catch (e) {
          var err = new Error('%s must be a valid JSON string')
          err.description = 'invalid_json'
          err.statusCode = 400
          return options.onError(err, req, res, next)
        }
      } else if (key === 'populate' || key === 'select' || key === 'sort') {
        try {
          req._ermQueryOptions[key] = JSON.parse(req.query[key])
        } catch (e) {
          req._ermQueryOptions[key] = req.query[key]
        }
      } else {
        req._ermQueryOptions[key] = req.query[key]
      }
    }

    next()
  }
}
