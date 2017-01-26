const http = require('http')
const _ = require('lodash')
const APIMethod = require('../APIMethod')
const Promise = require('bluebird')
const cloneMongooseQuery = require('./shared').cloneMongooseQuery

/**
 *
 * @param {ERMOperation} state
 * @param {Object} req
 */
function getContext (state, req) {
  const options = state.options

  return new Promise(resolve => {
    options.contextFilter(state.model, req, context => resolve([ context ]))
  }).then(([ context ]) => {
    // This request operates on all documents in the context
    if (_.isNil(req.params.id)) {
      return state.set('context', context)
    }

    // This is the "context" of the document: the query that returns the
    // document itself.
    // We need to add both the document context AND the document to state.
    const documentQuery = context
      .findOne().and({
        [options.idProperty]: req.params.id
      })
      .lean(false).read(options.readPreference)

    // Execute the document query
    return cloneMongooseQuery(documentQuery).exec()
      .then(document => {
        if (!document) {
          return Promise.reject(new Error(http.STATUS_CODES[404]))
        }

        // Store the document and document context in state
        return state.set('document', document).set('context', documentQuery)
      })
  })
}

module.exports = new APIMethod(getContext)
