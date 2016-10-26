const isDistinctExcluded = require('./shared').isDistinctExcluded
const findById = require('./shared').findById
const http = require('http')

/**
 * Given a model, erm options, and a list of excluded keys for model descendants, returns
 * Express middleware that builds a mongoose query to retrieve a _single_ item (specified by
 * its id), executes the query, and stores the result (a single document) in the request.
 *
 * @param {Object} model
 * @param {Object} options
 * @param {Object} excludedMap
 * @return {function(*=, *=, *=)}
 */
function getItem (model, options, excludedMap) {
  const buildQuery = require('../buildQuery')(options)
  const errorHandler = require('../errorHandler')(options)

  return (req, res, next) => {
    if (isDistinctExcluded(options.filter, excludedMap, req)) {
      req.erm.result = []
      req.erm.statusCode = 200
      return next()
    }

    options.contextFilter(model, req, (filteredContext) => {
      buildQuery(findById(filteredContext, req.params.id, options.idProperty), req._ermQueryOptions).then((item) => {
        if (!item) {
          return errorHandler(req, res, next)(new Error(http.STATUS_CODES[404]))
        }

        req.erm.result = item
        req.erm.statusCode = 200

        next()
      }, errorHandler(req, res, next))
    })
  }
}

module.exports = getItem
