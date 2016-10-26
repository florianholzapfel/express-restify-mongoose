/*
 * Generate RESTful URI paths for the an Express router.
 */

const assert = require('assert')

/**
 * Given an array of URI paths, joins them together using forward slashes.
 *
 * Handles leading and trailing forward slashes such that you won't end up
 * with a path that has multiple successive forward slashes.
 *
 * Example:
 *  console.log(joinPathsAsURL('foo', 'bar', ':id')) // 'foo/bar/:id'
 *  console.log(joinPathsAsURL('/baz/', 'biz/', ':id')) // '/baz/biz/:id'
 *
 * @param {...String} paths - the paths to join as a URL
 * @return {String}
 */
function joinPathsAsURL (...paths) {
  if (paths.length === 0) {
    return ''
  }

  return paths.join('/').replace(/\/+/gi, '/')
}
module.exports.joinPathsAsURL = joinPathsAsURL

class RESTPathGenerator {
  constructor (apiPrefix = '', apiVersion = '', modelName) {
    assert(typeof modelName === 'string', 'modelName must be a string')

    this._apiPrefix = apiPrefix
    this._apiVersion = apiVersion
    this._modelName = modelName

    this._basePath = joinPathsAsURL(
      this._apiPrefix + this._apiVersion,
      this._modelName
    )

    // Is a document id already in the base path?
    const basePathContainsDocumentId = this._basePath.indexOf('/:id') !== -1

    // Path to a single document specified by its id
    this._singleDocumentPath = basePathContainsDocumentId
      ? this._basePath
      : joinPathsAsURL(this._basePath, ':id')

    // Path to all documents for the model
    this._allDocumentsPath = this._singleDocumentPath.replace('/:id', '')
  }

  /**
   * Path to a single document specified by its id
   * @return {String}
   */
  get singleDocument () {
    return this._singleDocumentPath
  }

  /**
   * Path to the set of all documents
   * @return {String}
   */
  get allDocuments () {
    return this._allDocumentsPath
  }

  /**
   * Path to the count of all documents
   * @return {String}
   */
  get allDocumentsCount () {
    return joinPathsAsURL(this._allDocumentsPath, 'count')
  }

  /**
   * Path to a single document specified by its id, retrieve shallowly
   * @return {String}
   */
  get singleDocumentShallow () {
    return joinPathsAsURL(this._singleDocumentPath, 'shallow')
  }
}

module.exports = RESTPathGenerator
module.exports.joinPathsAsURL = joinPathsAsURL
