var express = require('express')
var bodyParser = require('body-parser')
var methodOverride = require('method-override')
var restify = require('restify')

function Express () {
  var app = express()
  app.use(bodyParser.json())
  app.use(bodyParser.urlencoded({ extended: true }))
  app.use(methodOverride())
  return app
}

function Restify () {
  var app = restify.createServer()
  app.use(restify.queryParser())
  app.use(restify.bodyParser())
  app.isRestify = true
  return app
}

function runTests (createFn) {
  describe(createFn.name, function () {
    require('./integration/create')(createFn)
    require('./integration/read')(createFn)
    require('./integration/update')(createFn)
    require('./integration/delete')(createFn)
  })
}

[Express, Restify].forEach(runTests)
