const APIOperation = require('../../Transformation').APIOperation

/**
 * Given the body of an object, query options, and an access level (all in state), creates
 * a new document in the database based on the object body and options.
 *
 * The document will be an instance of the model in state, with keys filtered according to the
 * filter in state.
 *
 * @param {module:ERMOperation} state - application state
 * @return {Promise}
 */
function createObject (state) {
  const model = state.model
  const queryOptions = state.query

  return model.create(state.body)
    .then(newDocument => {
      return model.populate(
        newDocument,
        queryOptions.populate || []
      )
    })
    .then(newDocument => {
      return state
        .set('result', newDocument)
        .set('statusCode', 201)
    })
}

module.exports = new APIOperation(createObject)
