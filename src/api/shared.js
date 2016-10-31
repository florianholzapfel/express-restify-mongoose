/**
 * Given a filter, a list of excluded keys for model descendants, and an Express request
 * with the 'distinct' erm query option, returns true if the 'distinct' option
 * is excluded in the filter.
 *
 * @param {Object} filter
 * @param {Object} excludedMap
 * @param {Object} req
 * @return {boolean}
 */
module.exports.isDistinctExcluded = function (filter, excludedMap, req) {
  return filter.isExcluded(req._ermQueryOptions['distinct'], {
    access: req.access,
    excludedMap: excludedMap
  })
}

/**
 * Given a mongoose model query, an id, and an id property, find the first document in
 * the query-so-far that has the particular id.
 *
 * @param {ModelQuery} filteredContext
 * @param {*} id
 * @param {String} idProperty
 * @return {ModelQuery}
 */
module.exports.findById = function (filteredContext, id, idProperty) {
  return filteredContext.findOne().and({
    [idProperty]: id
  })
}

