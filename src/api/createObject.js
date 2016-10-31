const APIMethod = require('../APIMethod')

/**
 * Returns a function that, given the body of an object, query options, and an access level, creates
 * a new document in the database based on the object body and options.
 *
 * The document will be an instance of "model", with keys filtered according to "filter".
 *
 * @param {Object} model - mongoose model to create instances of
 * @param {Filter} filter - resource filter to use for access level filtering, population options, etc.
 * @return {function(Object, Object, String): Promise}
 */
function createObject (model, filter) {
  return function (objectBody = {}, queryOptions, accessLevel) {
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
}

function createObjectWithRequest (ermInstance, req) {
  const createObjectFromRequest = createObject(ermInstance.model, ermInstance.options.filter)
  return createObjectFromRequest(req.body, req._ermQueryOptions, req.access)
    .then(newDocument => {
      return {
        erm: {
          result: newDocument,
          statusCode: 201
        }
      }
    })
}

module.exports = new APIMethod(
  createObject,
  createObjectWithRequest
)
