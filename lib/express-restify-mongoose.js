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
    postMiddleware: [],
    onError: require('./middlewares/onError')()
  })
}

var restify = function (app, model, opts) {
  var options = {}
  _.assign(options, getDefaults(), opts || {})

  var access = require('./middlewares/access')
  var ensureContentType = require('./middlewares/ensureContentType')()
  var prepareQuery = require('./middlewares/prepareQuery')(model)

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

  if (!_.isArray(options.postMiddleware)) {
    options.postMiddleware = [options.postMiddleware]
  }

  if (options.postMiddleware.length === 0) {
    options.postMiddleware.push(function () {})
  }

  var query = require('./query')(options)
  var ops = require('./operations')(model, options, query)

  if (undefined === app.delete) {
    app.delete = app.del
  }

  var modelName = options.name ? options.name : model.modelName
  modelName = options.plural === true ? inflection.pluralize(modelName) : modelName
  modelName = options.lowercase === true ? modelName.toLowerCase() : modelName

  var uri_item = util.format('%s%s/%s', options.prefix, options.version, modelName)
  if (uri_item.indexOf('/:id') === -1) {
    uri_item += '/:id'
  }

  var uri_items = uri_item.replace('/:id', '')
  var uri_count = uri_items + '/count'
  var uri_shallow = uri_item + '/shallow'

  if (options.access) {
    options.preMiddleware.push(access(options.access))
  }

  app.use(function (req, res, next) {
    req._erm = {
      queryOptions: {}
    }

    next()
  })

  app.get(uri_items, prepareQuery, options.preMiddleware, ops.getItems, options.postMiddleware)
  app.get(uri_count, prepareQuery, options.preMiddleware, ops.getCount, options.postMiddleware)
  app.get(uri_item, prepareQuery, options.preMiddleware, ops.getItem, options.postMiddleware)
  app.get(uri_shallow, prepareQuery, options.preMiddleware, ops.getShallow, options.postMiddleware)

  app.post(uri_item, ensureContentType, options.preMiddleware, ops.modifyObject, options.postMiddleware)
  app.post(uri_items, ensureContentType, options.preMiddleware, ops.createObject, options.postMiddleware)

  app.put(uri_item, ensureContentType, options.preMiddleware, ops.modifyObject, options.postMiddleware)

  app.delete(uri_items, options.preMiddleware, ops.deleteItems, options.postMiddleware)
  app.delete(uri_item, options.preMiddleware, ops.deleteItem, options.postMiddleware)

  if (options.restify) {
    app.on('restifyError', function (req, res, err, next) {
      options.onError(err, req, res, next)
    })
  } else {
    app.use(options.onError)
  }

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
