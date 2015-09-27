var restify = require('restify')

var createTests = require('./integration/create')
var readTests = require('./integration/read')
var updateTests = require('./integration/update')
var deleteTests = require('./integration/delete')

function Restify () {
  var app = restify.createServer()
  app.use(restify.queryParser())
  app.use(restify.bodyParser())
  app.isRestify = true
  return app
}

function runTests (createFn) {
  describe(createFn.name, function () {
    createTests(createFn)
    readTests(createFn)
    updateTests(createFn)
    deleteTests(createFn)
  })
}

runTests(Restify)
