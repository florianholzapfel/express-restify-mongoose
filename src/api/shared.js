const _ = require('lodash')

/**
 * Given a operation state, returns true if the 'distinct' option in the state's query
 * is excluded by the state's filter.
 *
 * @param {ERMOperation} state
 * @return {boolean}
 */
module.exports.isDistinctExcluded = function (state) {
  return state.options.filter.isExcluded(state.query.distinct, {
    access: state.accessLevel,
    excludedMap: state.excludedMap
  })
}

/**
 * Given a mongoose query, clones the query so that changes to the query can be made without
 * modifying the original query.
 *
 * @param {ModelQuery} mongooseQuery
 * @return {*}
 */
module.exports.cloneMongooseQuery = function (mongooseQuery) {
  if (!mongooseQuery || !_.isFunction(mongooseQuery.toConstructor)) {
    return mongooseQuery
  }

  return mongooseQuery.toConstructor()()
}
