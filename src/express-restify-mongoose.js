const util = require('util')
const _ = require('lodash')
const Filter = require('./resource_filter')
let customDefaults = null
let excludedMap = {}

function getDefaults () {
  return _.defaults(customDefaults || {}, {
    prefix: '/api',
    version: '/v1',
    idProperty: '_id',
    findOneAndUpdate: true,
    findOneAndRemove: true,
    lean: true,
    restify: false,
    runValidators: false,
    private: [],
    protected: []
  })
}

const restify = function (app, model, opts = {}) {
  let options = {}
  _.assign(options, getDefaults(), opts)

  const access = require('./middleware/access')
  const ensureContentType = require('./middleware/ensureContentType')(options)
  const filterAndFindById = require('./middleware/filterAndFindById')(model, options)
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
    model, excludedMap, filteredKeys: {
      private: options.private,
      protected: options.protected
    }
  })

  excludedMap[model.modelName] = options.filter.filteredKeys

  if (!_.isArray(options.preMiddleware)) {
    options.preMiddleware = options.preMiddleware ? [options.preMiddleware] : []
  }

  if (!_.isArray(options.preCreate)) {
    options.preCreate = options.preCreate ? [options.preCreate] : []
  }

  if (!_.isArray(options.preRead)) {
    options.preRead = options.preRead ? [options.preRead] : []
  }

  if (!_.isArray(options.preUpdate)) {
    options.preUpdate = options.preUpdate ? [options.preUpdate] : []
  }

  if (!_.isArray(options.preDelete)) {
    options.preDelete = options.preDelete ? [options.preDelete] : []
  }

  if (!options.contextFilter) {
    options.contextFilter = (model, req, done) => done(model)
  }

  if (!_.isArray(options.postCreate)) {
    options.postCreate = options.postCreate ? [options.postCreate] : []
  }

  if (!_.isArray(options.postRead)) {
    options.postRead = options.postRead ? [options.postRead] : []
  }

  if (!_.isArray(options.postUpdate)) {
    options.postUpdate = options.postUpdate ? [options.postUpdate] : []
  }

  if (!_.isArray(options.postDelete)) {
    options.postDelete = options.postDelete ? [options.postDelete] : []
  }

  if (!options.onError) {
    options.onError = onError(!options.restify)
  }

  if (!options.outputFn) {
    options.outputFn = outputFn(!options.restify)
  }

  options.name = options.name || model.modelName

  const ops = require('./operations')(model, options, excludedMap)

  let uri_item = `${options.prefix}${options.version}/${options.name}`
  if (uri_item.indexOf('/:id') === -1) {
    uri_item += '/:id'
  }

  const uri_items = uri_item.replace('/:id', '')
  const uri_count = uri_items + '/count'
  const uri_shallow = uri_item + '/shallow'

  if (_.isUndefined(app.delete)) {
    app.delete = app.del
  }

  app.use((req, res, next) => {
    req.erm = { model }
    next()
  })

  const accessMiddleware = options.access ? access(options) : []

  app.get(uri_items, prepareQuery, options.preMiddleware, options.preRead, accessMiddleware, ops.getItems, prepareOutput)
  app.get(uri_count, prepareQuery, options.preMiddleware, options.preRead, accessMiddleware, ops.getCount, prepareOutput)
  app.get(uri_item, prepareQuery, options.preMiddleware, options.preRead, accessMiddleware, ops.getItem, prepareOutput)
  app.get(uri_shallow, prepareQuery, options.preMiddleware, options.preRead, accessMiddleware, ops.getShallow, prepareOutput)

  app.post(uri_items, prepareQuery, ensureContentType, options.preMiddleware, options.preCreate, accessMiddleware, ops.createObject, prepareOutput)
  app.post(uri_item, util.deprecate(prepareQuery, 'Warning: in a future major version, the POST method to update resources will be removed. Use PATCH instead.'), ensureContentType, options.preMiddleware, options.findOneAndUpdate ? [] : filterAndFindById, options.preUpdate, accessMiddleware, ops.modifyObject, prepareOutput)

  app.put(uri_item, util.deprecate(prepareQuery, 'Warning: in a future major version, the PUT method will replace rather than update a resource. Use PATCH instead.'), ensureContentType, options.preMiddleware, options.findOneAndUpdate ? [] : filterAndFindById, options.preUpdate, accessMiddleware, ops.modifyObject, prepareOutput)
  app.patch(uri_item, prepareQuery, ensureContentType, options.preMiddleware, options.findOneAndUpdate ? [] : filterAndFindById, options.preUpdate, accessMiddleware, ops.modifyObject, prepareOutput)

  app.delete(uri_items, prepareQuery, options.preMiddleware, options.preDelete, ops.deleteItems, prepareOutput)
  app.delete(uri_item, prepareQuery, options.preMiddleware, options.findOneAndRemove ? [] : filterAndFindById, options.preDelete, ops.deleteItem, prepareOutput)

  return uri_items
}

module.exports = {
  defaults: function (options) {
    customDefaults = options
  },
  serve: restify
}
