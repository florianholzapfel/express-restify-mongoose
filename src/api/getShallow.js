const http = require('http')
const findById = require('./shared').findById

/**
 * Given a model, erm options, and a list of excluded keys for model descendants, returns
 * Express middleware that builds a mongoose query to retrieve a _single_ item (specified by
 * its id), executes the query, and stores the result (a single document) in the request.
 *
 * This operation is similar to getItem(), except it flattens nested object properties of the
 * document into a single truthy value
 *
 * @param {Object} model
 * @param {Object} options
 * @return {function(*=, *=, *=)}
 */
function getShallow (model, options) {
  const buildQuery = require('../buildQuery')(options)
  const errorHandler = require('../errorHandler')(options)

  return (req, res, next) => {
    options.contextFilter(model, req, (filteredContext) => {
      buildQuery(findById(filteredContext, req.params.id, options.idProperty), req._ermQueryOptions).then((item) => {
        if (!item) {
          return errorHandler(req, res, next)(new Error(http.STATUS_CODES[404]))
        }

        for (let prop in item) {
          item[prop] = typeof item[prop] === 'object' && prop !== '_id' ? true : item[prop]
        }

        req.erm.result = item
        req.erm.statusCode = 200

        next()
      }, errorHandler(req, res, next))
    })
  }
}

module.exports = getShallow
