var assert = require('assert')
var request = require('request')
var util = require('util')

module.exports = function (createFn, setup, dismantle) {
  var erm = require('../../lib/express-restify-mongoose')
  var db = require('./setup')()

  var testPort = 30023
  var testUrl = 'http://localhost:' + testPort

  describe('no options', function () {
    var app = createFn()
    var server

    before(function (done) {
      setup(function (err) {
        if (err) {
          return done(err)
        }

        erm.defaults({
          restify: app.isRestify
        })

        erm.serve(app, db.models.Customer)

        server = app.listen(testPort, done)
      })
    })

    after(function (done) {
      dismantle(app, server, done)
    })

    it('GET /Customers 200', function (done) {
      request.get({
        url: util.format('%s/api/v1/Customers', testUrl)
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        done()
      })
    })
  })

  describe('defaults - plural, lowercase and version set in defaults', function () {
    var app = createFn()
    var server

    before(function (done) {
      setup(function (err) {
        if (err) {
          return done(err)
        }

        erm.defaults({
          lowercase: true,
          plural: false,
          version: '/custom'
        })

        erm.serve(app, db.models.Customer, {
          restify: app.isRestify
        })

        erm.serve(app, db.models.Invoice, {
          restify: app.isRestify
        })

        server = app.listen(testPort, done)
      })
    })

    after(function (done) {
      erm.defaults({
        lowercase: false,
        plural: true
      })

      dismantle(app, server, done)
    })

    it('GET /customer 200', function (done) {
      request.get({
        url: util.format('%s/api/custom/customer', testUrl)
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        done()
      })
    })

    it('GET /invoice 200', function (done) {
      request.get({
        url: util.format('%s/api/custom/invoice', testUrl)
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        done()
      })
    })
  })

  describe('lowercase', function () {
    var app = createFn()
    var server

    before(function (done) {
      setup(function (err) {
        if (err) {
          return done(err)
        }

        erm.serve(app, db.models.Customer, {
          lowercase: true,
          restify: app.isRestify
        })

        server = app.listen(testPort, done)
      })
    })

    after(function (done) {
      dismantle(app, server, done)
    })

    it('GET /customers 200', function (done) {
      request.get({
        url: util.format('%s/api/v1/customers', testUrl)
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        done()
      })
    })

    it('GET /Customers 200 (Express), 404 (Restify)', function (done) {
      request.get({
        url: util.format('%s/api/v1/Customers', testUrl)
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, app.isRestify ? 404 : 200)
        done()
      })
    })
  })

  describe('name', function () {
    var app = createFn()
    var server

    before(function (done) {
      setup(function (err) {
        if (err) {
          return done(err)
        }

        erm.serve(app, db.models.Customer, {
          name: 'Client',
          restify: app.isRestify
        })

        server = app.listen(testPort, done)
      })
    })

    after(function (done) {
      dismantle(app, server, done)
    })

    it('GET /Clients 200', function (done) {
      request.get({
        url: util.format('%s/api/v1/Clients', testUrl)
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        done()
      })
    })
  })

  describe('plural', function () {
    describe('true', function () {
      var app = createFn()
      var server

      before(function (done) {
        setup(function (err) {
          if (err) {
            return done(err)
          }

          erm.serve(app, db.models.Customer, {
            plural: true,
            restify: app.isRestify
          })

          server = app.listen(testPort, done)
        })
      })

      after(function (done) {
        dismantle(app, server, done)
      })

      it('GET /Customer 404', function (done) {
        request.get({
          url: util.format('%s/api/v1/Customer', testUrl)
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 404)
          done()
        })
      })

      it('GET /Customers 200', function (done) {
        request.get({
          url: util.format('%s/api/v1/Customers', testUrl)
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          done()
        })
      })
    })

    describe('false', function () {
      var app = createFn()
      var server

      before(function (done) {
        setup(function (err) {
          if (err) {
            return done(err)
          }

          erm.serve(app, db.models.Customer, {
            plural: false,
            restify: app.isRestify
          })

          server = app.listen(testPort, done)
        })
      })

      after(function (done) {
        dismantle(app, server, done)
      })

      it('GET /Customer 200', function (done) {
        request.get({
          url: util.format('%s/api/v1/Customer', testUrl)
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          done()
        })
      })

      it('GET /Customers 404', function (done) {
        request.get({
          url: util.format('%s/api/v1/Customers', testUrl)
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 404)
          done()
        })
      })
    })
  })
}
