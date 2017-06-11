const Transformation = require('../Transformation').Transformation
const Promise = require('bluebird')

function filterRequestBody (state, req) {
  const filteredObject = state.options.filter.filterObject(
    req.body || {},
    {
      access: state.accessLevel,
      populate: state.query.populate
    }
  )

  if (state.model.schema.options._id) {
    delete filteredObject._id
  }

  if (state.model.schema.options.versionKey) {
    delete filteredObject[state.model.schema.options.versionKey]
  }

  // HACK: consumer hooks might depend on us removing the _id and version key
  // Ideally, we don't mutate the request body.
  req.body = filteredObject

  return Promise.resolve(state.set('body', filteredObject))
}

module.exports = new Transformation(filterRequestBody)
