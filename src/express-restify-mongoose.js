'use strict'

const clone = require('lodash.clone')
const defaults = require('lodash.defaults')
const ensureArray = require('ensure-array')
const util = require('util')
const Filter = require('./resource_filter')
let customDefaults = null
let excludedMap = {}

function getDefaults () {
  return defaults(clone(customDefaults) || {}, {
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

const restify = function (app, model, opts) {
  const options = Object.assign({}, getDefaults(), opts || {})

  const access = require('./middleware/access')
  const ensureContentType = require('./middleware/ensureContentType')(options)
  const filterAndFindById = require('./middleware/filterAndFindById')(model, options)
  const onError = require('./middleware/onError')
  const outputFn = require('./middleware/outputFn')
  const prepareQuery = require('./middleware/prepareQuery')(options)
  const prepareOutput = require('./middleware/prepareOutput')(options, excludedMap)

  if (!Array.isArray(options.private)) {
    throw new Error('"options.private" must be an array of fields')
  }

  if (!Array.isArray(options.protected)) {
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

  options.preMiddleware = ensureArray(options.preMiddleware)
  options.preCreate = ensureArray(options.preCreate)
  options.preRead = ensureArray(options.preRead)
  options.preUpdate = ensureArray(options.preUpdate)
  options.preDelete = ensureArray(options.preDelete)

  if (!options.contextFilter) {
    options.contextFilter = (model, req, done) => done(model)
  }

  options.postCreate = ensureArray(options.postCreate)
  options.postRead = ensureArray(options.postRead)
  options.postUpdate = ensureArray(options.postUpdate)
  options.postDelete = ensureArray(options.postDelete)

  if (!options.onError) {
    options.onError = onError(!options.restify)
  }

  if (!options.outputFn) {
    options.outputFn = outputFn(!options.restify)
  }

  options.name = options.name || model.modelName

  const ops = require('./operations')(model, options, excludedMap)

  let uriItem = `${options.prefix}${options.version}/${options.name}`
  if (uriItem.indexOf('/:id') === -1) {
    uriItem += '/:id'
  }

  const uriItems = uriItem.replace('/:id', '')
  const uriCount = uriItems + '/count'
  const uriShallow = uriItem + '/shallow'

  if (typeof app.delete === 'undefined') {
    app.delete = app.del
  }

  app.use((req, res, next) => {
    req.erm = { model }
    next()
  })

  const accessMiddleware = options.access ? access(options) : []

  app.get(uriItems, prepareQuery, options.preMiddleware, options.preRead, accessMiddleware, ops.getItems, prepareOutput)
  app.get(uriCount, prepareQuery, options.preMiddleware, options.preRead, accessMiddleware, ops.getCount, prepareOutput)
  app.get(uriItem, prepareQuery, options.preMiddleware, options.preRead, accessMiddleware, ops.getItem, prepareOutput)
  app.get(uriShallow, prepareQuery, options.preMiddleware, options.preRead, accessMiddleware, ops.getShallow, prepareOutput)

  app.post(uriItems, prepareQuery, ensureContentType, options.preMiddleware, options.preCreate, accessMiddleware, ops.createObject, prepareOutput)
  app.post(uriItem, util.deprecate(prepareQuery, 'express-restify-mongoose: in a future major version, the POST method to update resources will be removed. Use PATCH instead.'), ensureContentType, options.preMiddleware, options.findOneAndUpdate ? [] : filterAndFindById, options.preUpdate, accessMiddleware, ops.modifyObject, prepareOutput)

  app.put(uriItem, util.deprecate(prepareQuery, 'express-restify-mongoose: in a future major version, the PUT method will replace rather than update a resource. Use PATCH instead.'), ensureContentType, options.preMiddleware, options.findOneAndUpdate ? [] : filterAndFindById, options.preUpdate, accessMiddleware, ops.modifyObject, prepareOutput)
  app.patch(uriItem, prepareQuery, ensureContentType, options.preMiddleware, options.findOneAndUpdate ? [] : filterAndFindById, options.preUpdate, accessMiddleware, ops.modifyObject, prepareOutput)

  app.delete(uriItems, prepareQuery, options.preMiddleware, options.preDelete, ops.deleteItems, prepareOutput)
  app.delete(uriItem, prepareQuery, options.preMiddleware, options.findOneAndRemove ? [] : filterAndFindById, options.preDelete, ops.deleteItem, prepareOutput)

  return uriItems
}

module.exports = {
  defaults: function (options) {
    customDefaults = options
  },
  serve: restify
}
