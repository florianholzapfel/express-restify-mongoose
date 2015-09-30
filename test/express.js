var express = require('express')
var bodyParser = require('body-parser')
var methodOverride = require('method-override')

var createTests = require('./integration/create')
var readTests = require('./integration/read')
var updateTests = require('./integration/update')
var deleteTests = require('./integration/delete')
var accessTests = require('./integration/access')
var optionsTests = require('./integration/options')
var virtualsTests = require('./integration/virtuals')

var db = require('./integration/setup')()

function Express () {
  var app = express()
  app.use(bodyParser.json())
  app.use(bodyParser.urlencoded({ extended: true }))
  app.use(methodOverride())
  return app
}

function setup (callback) {
  db.initialize(function (err) {
    if (err) {
      return callback(err)
    }

    db.reset(callback)
  })
}

function dismantle (app, server, callback) {
  db.close(function (err) {
    if (err) {
      return callback(err)
    }

    if (app.close) {
      return app.close(callback)
    }

    server.close(callback)
  })
}

function runTests (createFn) {
  describe(createFn.name, function () {
    createTests(createFn, setup, dismantle)
    readTests(createFn, setup, dismantle)
    updateTests(createFn, setup, dismantle)
    deleteTests(createFn, setup, dismantle)
    accessTests(createFn, setup, dismantle)
    optionsTests(createFn, setup, dismantle)
    virtualsTests(createFn, setup, dismantle)
  })
}

runTests(Express)
