const http = require('http')
const findById = require('./shared').findById

/**
 * Given a model and erm options, returns Express middleware that deletes a single document
 * from the database, specified by its id property.
 *
 * @param {Object} model
 * @param {Object} options
 * @return {function(*=, *=, *=)}
 */
function deleteItem (model, options) {
  const errorHandler = require('../errorHandler')(options)

  return (req, res, next) => {
    if (options.findOneAndRemove) {
      options.contextFilter(model, req, (filteredContext) => {
        findById(filteredContext, req.params.id, options.idProperty)
          .findOneAndRemove()
          .then((item) => {
            if (!item) {
              return errorHandler(req, res, next)(new Error(http.STATUS_CODES[404]))
            }

            req.erm.statusCode = 204

            next()
          }, errorHandler(req, res, next))
      })
    } else {
      req.erm.document.remove().then(() => {
        req.erm.statusCode = 204

        next()
      }, errorHandler(req, res, next))
    }
  }
}

module.exports = deleteItem
