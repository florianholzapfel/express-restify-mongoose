var restify = require('restify')

var createTests = require('./integration/create')
var readTests = require('./integration/read')
var updateTests = require('./integration/update')
var deleteTests = require('./integration/delete')
var accessTests = require('./integration/access')
var lowercaseTests = require('./integration/lowercase')
var virtualsTests = require('./integration/virtuals')

var db = require('./integration/setup')()

function Restify () {
  var app = restify.createServer()
  app.use(restify.queryParser())
  app.use(restify.bodyParser())
  app.isRestify = true
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
    accessTests(createFn)
    lowercaseTests(createFn)
    virtualsTests(createFn)
  })
}

runTests(Restify)
