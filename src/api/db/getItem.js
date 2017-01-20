const isDistinctExcluded = require('./../shared').isDistinctExcluded
const findById = require('./../shared').findById
const http = require('http')

const APIMethod = require('../../APIMethod')
const applyQueryToContext = require('../applyQueryToContext')

/**
 * Retrieve a single document based on a request. Use the query and context filter specified in
 * the ERM operation state.
 *
 * @param {ERMOperation} state
 * @param {Object} req
 * @return {Promise<ERMOperation>}
 */
function doGetItem (state, req) {
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
        const documentContext = findById(
          filteredContext,
          req.params.id,
          state.options.idProperty
        )

        applyQueryToContext(state.options, documentContext, state.query)
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

module.exports = new APIMethod(doGetItem)
