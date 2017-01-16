const isDistinctExcluded = require('./../shared').isDistinctExcluded
const _ = require('lodash')

const APIMethod = require('../../APIMethod')
const getQueryBuilder = require('../../buildQuery')
const cloneMongooseQuery = require('../shared').cloneMongooseQuery

const getCount = require('./getCount')

/**
 * Given global query options, a Mongoose context (just a ModelQuery), and a Mongo
 * query, get all of the documents matching the query in the context.
 *
 * @param {Object} queryOptions - Global options to apply to all queries
 * @param queryOptions.lean
 * @param queryOptions.readPreference
 * @param queryOptions.limit
 *
 * @param {ModelQuery} mongooseContext - The documents to query
 * @param {Object} query - MongoDB query object to apply to the context
 *
 * @return {Promise}
 */
function getItems (queryOptions, mongooseContext, query) {
  const buildQuery = getQueryBuilder(queryOptions)

  return buildQuery(
    cloneMongooseQuery(mongooseContext.find()),
    query
  )
}

/**
 * Get all of the items matching a query inside some consumer-provided context.
 *
 * Note: Sets the total count of the operation if the totalCountHeader option is set.
 *
 * @param {ERMOperation} state
 * @param {Object} req
 * @return {Promise<ERMOperation>}
 */
function getItemsWithRequest (state, req) {
  // If distinct is excluded, there won't be anything to return.
  if (isDistinctExcluded(state.options.filter, state.excludedMap, req)) {
    return Promise.resolve(
      state.set('result', []).set('statusCode', 200)
    )
  }

  return new Promise((resolve, reject) => {
    // Get the context based on the model and request
    state.options.contextFilter(state.model, req,
      filteredContext => {
        getItems(state.options, filteredContext, state.query)
          .then(items => {
            // Find the items for all configurations, and set the status code
            return state.set('result', items).set('statusCode', 200)
          })
          .then(stateWithResult => {
            // If totalCountHeader is set and distinct isn't set, also get the total count
            if (stateWithResult.options.totalCountHeader && !stateWithResult.query.distinct) {
              return getTotalCountHeader(state, req)
                .then(count => {
                  return stateWithResult.set('totalCount', count)
                })
            }

            return stateWithResult
          })

          // Pass the results to the outer promise
          .then(stateWithResultAndCount => resolve(stateWithResultAndCount))
          .catch(err => reject(err))
      }
    )
  })
}

/**
 * Get the total count of items matching a query inside some consumer-provided context.
 *
 * Note: sets skip = 0 and limit = 0 for the query in state.
 *
 * @param {ERMOperation} state
 * @param {Object} req
 * @return {Promise<Number>}
 */
function getTotalCountHeader (state, req) {
  const noSkipOrLimit = _.assign({},
    state.query,
    {
      skip: 0,
      limit: 0
    }
  )

  return new Promise((resolve, reject) => {
    return state.options.contextFilter(state.model, req,
      countFilteredContext => {
        getCount.operation(state.options, countFilteredContext, noSkipOrLimit)
          .then(count => resolve(count))
          .catch(err => reject(err))
      })
  })
}

module.exports = new APIMethod(
  getItems,
  getItemsWithRequest
)
