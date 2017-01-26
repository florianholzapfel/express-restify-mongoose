const util = require('util')
const _ = require('lodash')

const Filter = require('./resource_filter')
const RESTPathGenerator = require('./RESTPathGenerator')
const ERMOperation = require('./ERMOperation')

let customDefaults = null
let excludedMap = {}

function getDefaults () {
  return _.defaults(_.clone(customDefaults) || {}, {
    prefix: '/api',
    version: '/v1',
    idProperty: '_id',
    findOneAndUpdate: true,
    findOneAndRemove: true,
    lean: true,
    restify: false,
    runValidators: false,
    allowRegex: true,
    private: [],
    protected: []
  })
}

function ensureValueIsArray (value) {
  if (_.isArray(value)) {
    return value
  }

  return value ? [value] : []
}

const restify = function (app, model, opts = {}) {
  let options = {}
  _.assign(options, getDefaults(), opts)

  const getContext = require('./api/getContext')
  const access = require('./middleware/access')
  const ensureContentType = require('./middleware/ensureContentType')(options)
  const onError = require('./middleware/onError')
  const outputFn = require('./middleware/outputFn')
  const prepareQuery = require('./middleware/prepareQuery')(options)
  const prepareOutput = require('./middleware/prepareOutput')(options, excludedMap)

  if (!_.isArray(options.private)) {
    throw new Error('"options.private" must be an array of fields')
  }

  if (!_.isArray(options.protected)) {
    throw new Error('"options.protected" must be an array of fields')
  }

  model.schema.eachPath((name, path) => {
    if (path.options.access) {
      switch (path.options.access.toLowerCase()) {
        case 'private':
          options.private.push(name)
          break
        case 'protected':
          options.protected.push(name)
          break
      }
    }
  })

  options.filter = new Filter({
    model,
    excludedMap,
    filteredKeys: {
      private: options.private,
      protected: options.protected
    }
  })

  excludedMap[model.modelName] = options.filter.filteredKeys

  options.preMiddleware = ensureValueIsArray(options.preMiddleware)
  options.preCreate = ensureValueIsArray(options.preCreate)
  options.preRead = ensureValueIsArray(options.preRead)
  options.preUpdate = ensureValueIsArray(options.preUpdate)
  options.preDelete = ensureValueIsArray(options.preDelete)

  if (!options.contextFilter) {
    options.contextFilter = (model, req, done) => done(model)
  }

  options.postCreate = ensureValueIsArray(options.postCreate)
  options.postRead = ensureValueIsArray(options.postRead)
  options.postUpdate = ensureValueIsArray(options.postUpdate)
  options.postDelete = ensureValueIsArray(options.postDelete)

  if (!options.onError) {
    options.onError = onError(!options.restify)
  }

  if (!options.outputFn) {
    options.outputFn = outputFn(!options.restify)
  }

  options.name = options.name || model.modelName

  const initialOperationState = ERMOperation.initialize(model, options, excludedMap)

  const ops = require('./operations')(initialOperationState)
  const restPaths = new RESTPathGenerator(options.prefix, options.version, options.name)

  if (_.isUndefined(app.delete)) {
    app.delete = app.del
  }

  app.use((req, res, next) => {
    // At the start of each request, add our initial operation state
    _.merge(req, initialOperationState.serializeToRequest())

    next()
  })

  const accessMiddleware = options.access ? access(options) : []
  const contextMiddleware = getContext.getMiddleware(initialOperationState)

  function deprecatePrepareQuery (text) {
    return util.deprecate(
      prepareQuery,
      `express-restify-mongoose: in a future major version, ${text} ` +
      `Use PATCH instead.`
    )
  }

  // Retrieval

  app.get(
    restPaths.allDocuments, prepareQuery, options.preMiddleware, contextMiddleware,
    options.preRead, accessMiddleware, ops.getItems,
    prepareOutput
  )

  app.get(
    restPaths.allDocumentsCount, prepareQuery, options.preMiddleware, contextMiddleware,
    options.preRead, accessMiddleware, ops.getCount,
    prepareOutput
  )

  app.get(
    restPaths.singleDocument, prepareQuery, options.preMiddleware, contextMiddleware,
    options.preRead, accessMiddleware, ops.getItem,
    prepareOutput
  )

  app.get(
    restPaths.singleDocumentShallow, prepareQuery, options.preMiddleware, contextMiddleware,
    options.preRead, accessMiddleware, ops.getShallow,
    prepareOutput
  )

  // Creation

  app.post(
    restPaths.allDocuments, prepareQuery, ensureContentType, options.preMiddleware,
    options.preCreate, accessMiddleware, ops.createObject,
    prepareOutput
  )

  // Modification

  app.post(
    restPaths.singleDocument,
    deprecatePrepareQuery('the POST method to update resources will be removed.'),
    ensureContentType, options.preMiddleware, contextMiddleware,
    options.preUpdate, accessMiddleware, ops.modifyObject,
    prepareOutput
  )

  app.put(
    restPaths.singleDocument,
    deprecatePrepareQuery(`the PUT method will replace rather than update a resource.`),
    ensureContentType, options.preMiddleware, contextMiddleware,
    options.preUpdate, accessMiddleware, ops.modifyObject,
    prepareOutput
  )

  app.patch(
    restPaths.singleDocument,
    prepareQuery, ensureContentType, options.preMiddleware, contextMiddleware,
    options.preUpdate, accessMiddleware, ops.modifyObject,
    prepareOutput
  )

  // Deletion

  app.delete(
    restPaths.allDocuments,
    prepareQuery, options.preMiddleware, contextMiddleware,
    options.preDelete, ops.deleteItems,
    prepareOutput
  )

  app.delete(
    restPaths.singleDocument,
    prepareQuery, options.preMiddleware, contextMiddleware,
    options.preDelete, ops.deleteItem,
    prepareOutput
  )

  return restPaths.allDocuments
}

module.exports = {
  defaults: function (options) {
    customDefaults = options
  },
  serve: restify
}
