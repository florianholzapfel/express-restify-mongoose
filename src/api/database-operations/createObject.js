const APIMethod = require('../../APIMethod')

/**
 * Given the body of an object, query options, and an access level (all in state), creates
 * a new document in the database based on the object body and options.
 *
 * The document will be an instance of the model in state, with keys filtered according to the
 * filter in state.
 *
 * @param {ERMOperation} state - application state
 * @param {Object} objectBody - body of the object to create
 * @return {Promise}
 */
function createObject (state, objectBody = {}) {
  const filter = state.options.filter
  const model = state.model
  const queryOptions = state.query
  const accessLevel = state.accessLevel

  const filteredObject = filter.filterObject(
    objectBody,
    {
      access: accessLevel,
      populate: queryOptions.populate
    }
  )

  if (model.schema.options._id) {
    delete filteredObject._id
  }

  if (model.schema.options.versionKey) {
    delete filteredObject[model.schema.options.versionKey]
  }

  return model.create(filteredObject)
    .then(newDocument => model.populate(
      newDocument,
      queryOptions.populate || []
    ))
}

/**
 * Given an ERM instance and an Express request, create a new object.
 *
 * @param {ERMOperation} ermInstance
 * @param {Object} req - the Express request
 * @return {Promise}
 */
function createObjectWithRequest (ermInstance, req) {
  return createObject(ermInstance, req.body)
    .then(newDocument => {
      return ermInstance
        .setResult(newDocument)
        .setStatusCode(201)
    })
}

module.exports = new APIMethod(
  createObject,
  createObjectWithRequest
)
