const http = require('http')
const findById = require('./../shared').findById
const applyQueryToContext = require('../applyQueryToContext')
const _ = require('lodash')

const APIMethod = require('../../APIMethod')

/**
 * Given an object, replaces all of its Object-type properties with the value true.
 * @param {Object} document
 * @return {Object}
 */
function stripObjectProperties (document) {
  if (_.isNil(document) || !_.isObject(document)) {
    return document
  }

  return _.mapValues(
    document,
    (property, key) => {
      return _.isObject(property) && key !== '_id'
        ? true
        : property
    }
  )
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
function doGetShallow (state, req) {
  // Explicit construction because contextFilter() takes a callback
  return new Promise((resolve, reject) => {
    state.options.contextFilter(state.model, req,
      filteredContext => {
        const documentContext = findById(filteredContext, req.params.id, state.options.idProperty)
        applyQueryToContext(state.options, documentContext, state.query)
          .then(stripObjectProperties)
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

module.exports = new APIMethod(doGetShallow)
