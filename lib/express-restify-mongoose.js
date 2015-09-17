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
var Filter = require('./resource_filter')
var _ = require('lodash')
var inflection = require('inflection')
var customDefaults = null

function getDefaults () {
  var options = {}

  _.defaults(options, customDefaults, {
    prefix: '/api',
    version: '/v1',
    private: [],
    protected: [],
    lean: true,
    plural: true,
    middleware: [],
    findOneAndUpdate: true,
    findOneAndRemove: true,
    contextFilter: null,
    postCreate: null,
    postUpdate: null,
    runValidators: false
  })

  return options
}

var restify = function (app, model, opts) {
  var queryOptions = {
    protected: ['skip', 'limit', 'sort', 'distinct', 'populate', 'select', 'lean', 'query', 'projection'],
    current: {}
  }

  var access = require('./middlewares/access')
  var cleanQuery = require('./middlewares/cleanQuery')(queryOptions)
  var ensureContentType = require('./middlewares/ensureContentType')()
  var postProcess
  var usingExpress
  var options = getDefaults()

  for (var prop in opts) {
    if (opts[prop] instanceof Array) {
      options[prop] = []
      for (var index in opts[prop]) {
        options[prop][index] = opts[prop][index]
      }
    } else {
      options[prop] = opts[prop]
    }
  }

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

  postProcess = options.postProcess || function () {}

  if (options.middleware) {
    if (!(options.middleware instanceof Array)) {
      options.middleware = [options.middleware]
    }
  }

  usingExpress = !options.restify

  var onError = options.onError ? options.onError : function (err, req, res, next) {
    var errorString
    res.setHeader('Content-Type', 'application/json')
    errorString = JSON.stringify(err)

    if (usingExpress) {
      res.status(err.statusCode).send(errorString)
    } else {
      res.send(err.statusCode, errorString)
    }
  }

  var filter = new Filter(model, options.private, options.protected)
  var query = require('./query')(model, filter, options, queryOptions)
  var ops = require('./operations')(model, filter, options, query)

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
    options.middleware.push(access(options.access))
  }

  app.get(uri_items, cleanQuery, options.middleware, ops.getItems, postProcess)
  app.get(uri_count, cleanQuery, options.middleware, ops.getCount, postProcess)
  app.get(uri_item, cleanQuery, options.middleware, ops.getItem, postProcess)
  app.get(uri_shallow, cleanQuery, options.middleware, ops.getShallow, postProcess)

  app.post(uri_item, ensureContentType, options.middleware, ops.modifyObject, postProcess)
  app.post(uri_items, ensureContentType, options.middleware, ops.createObject, postProcess)

  app.put(uri_item, ensureContentType, options.middleware, ops.modifyObject, postProcess)

  app.delete(uri_items, options.middleware, ops.deleteItems, postProcess)
  app.delete(uri_item, options.middleware, ops.deleteItem, postProcess)

  if (usingExpress) {
    app.use(onError)
  } else {
    app.on('restifyError', function (req, res, err, next) {
      onError(err, req, res, next)
    })
  }

  if (usingExpress && _.isFunction(require('express').Router)) {
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
