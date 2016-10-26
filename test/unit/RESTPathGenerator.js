const assert = require('assert')
const RESTPathGenerator = require('../../src/RESTPathGenerator')
const joinPathsAsURL = require('../../src/RESTPathGenerator').joinPathsAsURL

describe('RESTPathGenerator', () => {
  describe('constructor', () => {
    it('throws if non-string model name is passed to constructor', () => {
      assert.throws(
        () => new RESTPathGenerator('', '', undefined),
        Error
      )

      assert.throws(
        () => new RESTPathGenerator('', '', 1),
        Error
      )
    })
  })

  const prefix = '/api'
  const version = '/v1'
  const modelName = 'foo'

  const idInBasePath = new RESTPathGenerator(prefix, version, joinPathsAsURL(modelName, ':id'))
  const noIdInBasePath = new RESTPathGenerator(prefix, version, modelName)

  describe('singleDocument', () => {
    const correctSingleDocument = joinPathsAsURL(prefix, version, modelName, ':id')
    it('handles :id in the base path', () => {
      assert.equal(
        idInBasePath.singleDocument,
        correctSingleDocument
      )
    })

    it('appends :id to the path', () => {
      assert.equal(
        noIdInBasePath.singleDocument,
        correctSingleDocument
      )
    })
  })

  describe('allDocuments', () => {
    const correctAllDocuments = joinPathsAsURL(prefix, version, modelName)
    it('handles :id in the base path', () => {
      assert.equal(
        idInBasePath.allDocuments,
        correctAllDocuments
      )
    })

    it('joins the prefix, version, and model name', () => {
      assert.equal(
        noIdInBasePath.allDocuments,
        correctAllDocuments
      )
    })
  })

  describe('allDocumentsCount', () => {
    const correctAllDocumentsCount = joinPathsAsURL(prefix, version, modelName, 'count')
    it('handles :id in the base path', () => {
      assert.equal(
        idInBasePath.allDocumentsCount,
        correctAllDocumentsCount
      )
    })

    it('joins the prefix, version, model name, and "count"', () => {
      assert.equal(
        noIdInBasePath.allDocumentsCount,
        correctAllDocumentsCount
      )
    })
  })

  describe('allDocumentsCount', () => {
    const correctSingleDocumentShallow = joinPathsAsURL(prefix, version, modelName, ':id', 'shallow')
    it('handles :id in the base path', () => {
      assert.equal(
        idInBasePath.singleDocumentShallow,
        correctSingleDocumentShallow
      )
    })

    it('joins the prefix, version, model name, ":id", and "shallow"', () => {
      assert.equal(
        noIdInBasePath.singleDocumentShallow,
        correctSingleDocumentShallow
      )
    })
  })
})

describe('joinPathsAsURL', () => {
  it('returns empty string when no args passed', () => {
    assert.equal(joinPathsAsURL(), '')
  })

  it('combines arguments with forward slashes', () => {
    assert.equal(
      joinPathsAsURL('foo', 'bar'),
      'foo/bar'
    )
  })

  it('handles trailing slash in first argument', () => {
    assert.equal(
      joinPathsAsURL('/foo', 'bar'),
      '/foo/bar'
    )
  })

  it('handles leading and trailing slashes', () => {
    assert.equal(
      joinPathsAsURL('/foo/', '/bar', 'baz/'),
      '/foo/bar/baz/'
    )
  })
})
