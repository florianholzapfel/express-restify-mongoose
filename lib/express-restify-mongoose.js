/**
 * express-restify-mongoose.js
 *
 * Copyright (C) 2013 by Florian Holzapfel
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the 'Software'), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 **/
'use strict'

var util = require('util')
var _ = require('lodash')
var inflection = require('inflection')
var customDefaults = null

function getDefaults () {
  return _.defaults(customDefaults || {}, {
    prefix: '/api',
    version: '/v1',
    idProperty: '_id',
    findOneAndUpdate: true,
    findOneAndRemove: true,
    lean: true,
    lowercase: false,
    plural: true,
    restify: false,
    runValidators: false,
    preMiddleware: [],
    private: [],
    protected: [],
    postMiddleware: []
  })
}

var restify = function (app, model, opts) {
  var options = {}
  _.assign(options, getDefaults(), opts || {})

  var access = require('./middleware/access')
  var ensureContentType = require('./middleware/ensureContentType')()
  var onError = require('./middleware/onError')
  var outputFn = require('./middleware/outputFn')
  var prepareQuery = require('./middleware/prepareQuery')(model, options)
  var prepareOutput = require('./middleware/prepareOutput')(options)

  model.schema.eachPath(function (name, path) {
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

  if (!_.isArray(options.preMiddleware)) {
    options.preMiddleware = [options.preMiddleware]
  }

  if (options.access) {
    options.preMiddleware.push(access(options.access))
  }

  if (!_.isArray(options.postMiddleware)) {
    options.postMiddleware = [options.postMiddleware]
  }

  if (options.postMiddleware.length === 0) {
    options.postMiddleware.push(function (req, res, next) {
      next()
    })
  }

  if (!options.onError) {
    options.onError = onError(!options.restify)
  }

  if (!options.outputFn) {
    options.outputFn = outputFn(!options.restify)
  }

  options.name = options.name || model.modelName

  if (options.plural) {
    options.name = inflection.pluralize(options.name)
  }

  if (options.lowercase) {
    options.name = options.name.toLowerCase()
  }

  var ops = require('./operations')(model, options)

  var uri_item = util.format('%s%s/%s', options.prefix, options.version, options.name)
  if (uri_item.indexOf('/:id') === -1) {
    uri_item += '/:id'
  }

  var uri_items = uri_item.replace('/:id', '')
  var uri_count = uri_items + '/count'
  var uri_shallow = uri_item + '/shallow'

  if (undefined === app.delete) {
    app.delete = app.del
  }

  app.use(function (req, res, next) {
    req._erm = {
      queryOptions: {}
    }

    next()
  })

  app.get(uri_items, prepareQuery, options.preMiddleware, ops.getItems, prepareOutput)
  app.get(uri_count, prepareQuery, options.preMiddleware, ops.getCount, prepareOutput)
  app.get(uri_item, prepareQuery, options.preMiddleware, ops.getItem, prepareOutput)
  app.get(uri_shallow, prepareQuery, options.preMiddleware, ops.getShallow, prepareOutput)

  app.post(uri_items, ensureContentType, options.preMiddleware, ops.createObject, prepareOutput)
  app.post(uri_item, ensureContentType, options.preMiddleware, ops.modifyObject, prepareOutput)

  app.put(uri_item, ensureContentType, options.preMiddleware, ops.modifyObject, prepareOutput)

  app.delete(uri_items, options.preMiddleware, ops.deleteItems, prepareOutput)
  app.delete(uri_item, options.preMiddleware, ops.deleteItem, prepareOutput)

  if (!options.restify && _.isFunction(require('express').Router)) {
    var express = require('express')
    var uriItemsRouter = new express.Router()
    app.use(uri_items, uriItemsRouter)
    return uriItemsRouter
  }
}

module.exports = {
  defaults: function (options) {
    customDefaults = options
  },
  serve: restify
}
