/**
 * Given a model and erm options, returns Express middleware that creates a new document
 * (whose type comes from the model) using the request body.
 *
 * Handles custom id properties and populated subdocuments.
 *
 * @param {Object} model
 * @param {Object} options
 * @return {function(*=, *=, *=)}
 */
function createObject (model, options) {
  const errorHandler = require('../errorHandler')(options)

  return (req, res, next) => {
    req.body = options.filter.filterObject(req.body || {}, {
      access: req.access,
      populate: req._ermQueryOptions.populate
    })

    if (model.schema.options._id) {
      delete req.body._id
    }

    if (model.schema.options.versionKey) {
      delete req.body[model.schema.options.versionKey]
    }

    model.create(req.body)
      .then((item) => model.populate(item, req._ermQueryOptions.populate || []))
      .then((item) => {
        req.erm.result = item
        req.erm.statusCode = 201

        next()
      }, errorHandler(req, res, next))
  }
}

module.exports = createObject
