var express = require('express')
var bodyParser = require('body-parser')
var methodOverride = require('method-override')

var createTests = require('./integration/create')
var readTests = require('./integration/read')
var updateTests = require('./integration/update')
var deleteTests = require('./integration/delete')
var accessTests = require('./integration/access')
var lowercaseTests = require('./integration/lowercase')
var virtualsTests = require('./integration/virtuals')

function Express () {
  var app = express()
  app.use(bodyParser.json())
  app.use(bodyParser.urlencoded({ extended: true }))
  app.use(methodOverride())
  return app
}

function runTests (createFn) {
  describe(createFn.name, function () {
    createTests(createFn)
    readTests(createFn)
    updateTests(createFn)
    deleteTests(createFn)
    accessTests(createFn)
    lowercaseTests(createFn)
    virtualsTests(createFn)
  })
}

runTests(Express)
