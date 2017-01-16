const http = require('http')
const findById = require('./../shared').findById
const getQueryBuilder = require('../../buildQuery')

const APIMethod = require('../../APIMethod')

/**
 * Given global query options, a Mongoose context (just a ModelQuery), and a Mongo
 * query, shallowly retrieve a single document with the correct id (and id property) that is also in
 * the supplied context and query.
 *
 * This operation is similar to getItem(), except it flattens nested object properties of the
 * document into a single truthy value
 *
 * @param {Object} queryOptions - Global options to apply to all queries
 * @param queryOptions.lean
 * @param queryOptions.readPreference
 * @param queryOptions.limit
 *
 * @param {ModelQuery} mongooseContext - The documents to query
 * @param {Object} query - MongoDB query object to apply to the context
 *
 * @param {String} documentId - the document's id
 * @param {String} idProperty - the model's id property
 *
 * @return {Promise<Object>}
 */
function getShallow (queryOptions, mongooseContext, query, documentId, idProperty) {
  const buildQuery = getQueryBuilder(queryOptions)

  return buildQuery(
    findById(mongooseContext, documentId, idProperty),
    query
  ).then(item => {
    // Strip object properties
    for (let prop in item) {
      item[prop] = typeof item[prop] === 'object' && prop !== '_id' ? true : item[prop]
    }

    return item
  })
}

/**
 * Shallowly retrieve a single item matching a query inside some consumer-provided context.
 *
 * Rejects with a 404 error if a document with that id isn't found in the context.
 *
 * @param {ERMOperation} state
 * @param {Object} req
 * @return {Promise<ERMOperation>}
 */
function getShallowWithRequest (state, req) {
  // Explicit construction because contextFilter() takes a callback
  return new Promise((resolve, reject) => {
    state.options.contextFilter(state.model, req,
      filteredContext => {
        getShallow(state.options, filteredContext, state.query, req.params.id, state.options.idProperty)
          .then(shallowItem => {
            // If the query succeeds but no document is found, return 404
            if (!shallowItem) {
              return Promise.reject(new Error(http.STATUS_CODES[404]))
            }

            return resolve(
              state
                .set('result', shallowItem)
                .set('statusCode', 200)
            )
          })
          .catch(err => reject(err))
      }
    )
  })
}

module.exports = new APIMethod(
  getShallow,
  getShallowWithRequest
)
