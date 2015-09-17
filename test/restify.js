'use strict'

var restify = require('restify')
var test = require('./test')

function Restify () {
  var app = restify.createServer()
  app.use(restify.queryParser())
  app.use(restify.bodyParser())
  app.isRestify = true
  return app
}
function RestifyCustomOutputFunction () {
  var app = restify.createServer()
  app.use(restify.queryParser())
  app.use(restify.bodyParser())
  app.isRestify = true
  app.outputFn = function (req, res, next, data) {
    res.send(data.statusCode || 200, data.result)
    next()
  }
  return app
}

[Restify, RestifyCustomOutputFunction].forEach(test)
