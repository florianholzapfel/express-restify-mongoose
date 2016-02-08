const express = require('express')
const bodyParser = require('body-parser')
const methodOverride = require('method-override')

const createTests = require('./integration/create')
const readTests = require('./integration/read')
const updateTests = require('./integration/update')
const deleteTests = require('./integration/delete')
const accessTests = require('./integration/access')
const contextFilterTests = require('./integration/contextFilter')
const middlewareTests = require('./integration/middleware')
const optionsTests = require('./integration/options')
const virtualsTests = require('./integration/virtuals')

const db = require('./integration/setup')()

function Express () {
  let app = express()
  app.use(bodyParser.json())
  app.use(bodyParser.urlencoded({ extended: true }))
  app.use(methodOverride())
  return app
}

function setup (callback) {
  db.initialize((err) => {
    if (err) {
      return callback(err)
    }

    db.reset(callback)
  })
}

function dismantle (app, server, callback) {
  db.close((err) => {
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
  describe(createFn.name, () => {
    createTests(createFn, setup, dismantle)
    readTests(createFn, setup, dismantle)
    updateTests(createFn, setup, dismantle)
    deleteTests(createFn, setup, dismantle)
    accessTests(createFn, setup, dismantle)
    contextFilterTests(createFn, setup, dismantle)
    middlewareTests(createFn, setup, dismantle)
    optionsTests(createFn, setup, dismantle)
    virtualsTests(createFn, setup, dismantle)
  })
}

runTests(Express)
