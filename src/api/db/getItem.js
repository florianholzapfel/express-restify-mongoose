const isDistinctExcluded = require('./../shared').isDistinctExcluded
const findById = require('./../shared').findById
const http = require('http')

const APIMethod = require('../../APIMethod')
const getQueryBuilder = require('../../buildQuery')

/**
 * Given an ERM operation, a mongoose context, and a document id to retrieve, retrieves the document.
 *
 * @param {ERMOperation} state
 * @param {ModelQuery} mongooseContext
 * @param {String|ObjectId} documentId
 * @return {Promise}
 */
function getItem (state, mongooseContext, documentId) {
  const buildQuery = getQueryBuilder(state.options)

  return buildQuery(
    findById(mongooseContext, documentId, state.options.idProperty),
    state.query
  )
}

/**
 * Retrieve a single document based on a request. Use the query and context filter specified in
 * the ERM operation state.
 *
 * @param {ERMOperation} state
 * @param {Object} req
 * @return {Promise<ERMOperation>}
 */
function getItemWithRequest (state, req) {
  if (isDistinctExcluded(state.options.filter, state.excludedMap, req)) {
    return Promise.resolve(
      state.set('result', []).set('statusCode', 200)
    )
  }

  return new Promise((resolve, reject) => {
    state.options.contextFilter(
      state.model,
      req,
      filteredContext => {
        getItem(state, filteredContext, req.params.id)
          .then(item => {
            if (!item) {
              return reject(new Error(http.STATUS_CODES[404]))
            }

            return resolve(
              state.set('result', item).set('statusCode', 200)
            )
          })
          .catch(err => reject(err))
      }
    )
  })
}

module.exports = new APIMethod(
  getItem,
  getItemWithRequest
)
