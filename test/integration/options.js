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

        erm.serve(app, db.models.Customer, app.isRestify ? {
          restify: app.isRestify
        } : undefined)

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

  describe('limit', function () {
    var app = createFn()
    var server

    before(function (done) {
      setup(function (err) {
        if (err) {
          return done(err)
        }

        erm.serve(app, db.models.Customer, {
          limit: 2,
          restify: app.isRestify
        })

        db.models.Customer.create([{
          name: 'Bob'
        }, {
          name: 'John'
        }, {
          name: 'Mike'
        }]).then(function (createdCustomers) {
          server = app.listen(testPort, done)
        }, function (err) {
          done(err)
        })
      })
    })

    after(function (done) {
      dismantle(app, server, done)
    })

    it('GET /Customers 200', function (done) {
      request.get({
        url: util.format('%s/api/v1/Customers', testUrl),
        json: true
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        assert.equal(body.length, 2)
        done()
      })
    })

    it('GET /Customers 200 - override limit in options (query.limit === 0)', function (done) {
      request.get({
        url: util.format('%s/api/v1/Customers', testUrl),
        qs: {
          limit: 0
        },
        json: true
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        assert.equal(body.length, 2)
        done()
      })
    })

    it('GET /Customers 200 - override limit in options (query.limit < options.limit)', function (done) {
      request.get({
        url: util.format('%s/api/v1/Customers', testUrl),
        qs: {
          limit: 1
        },
        json: true
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        assert.equal(body.length, 1)
        done()
      })
    })

    it('GET /Customers 200 - override limit in query (options.limit < query.limit)', function (done) {
      request.get({
        url: util.format('%s/api/v1/Customers', testUrl),
        qs: {
          limit: 3
        },
        json: true
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        assert.equal(body.length, 2)
        done()
      })
    })

    it('GET /Customers/count 200 - ignore limit', function (done) {
      request.get({
        url: util.format('%s/api/v1/Customers/count', testUrl),
        json: true
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        assert.equal(body.count, 3)
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

  describe('prefix', function () {
    var app = createFn()
    var server

    before(function (done) {
      setup(function (err) {
        if (err) {
          return done(err)
        }

        erm.serve(app, db.models.Customer, {
          prefix: '/applepie',
          restify: app.isRestify
        })

        server = app.listen(testPort, done)
      })
    })

    after(function (done) {
      dismantle(app, server, done)
    })

    it('GET /applepie/v1/Customers 200', function (done) {
      request.get({
        url: util.format('%s/applepie/v1/Customers', testUrl)
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        done()
      })
    })
  })

  describe('version', function () {
    describe('v8', function () {
      var app = createFn()
      var server

      before(function (done) {
        setup(function (err) {
          if (err) {
            return done(err)
          }

          erm.serve(app, db.models.Customer, {
            version: '/v8',
            restify: app.isRestify
          })

          server = app.listen(testPort, done)
        })
      })

      after(function (done) {
        dismantle(app, server, done)
      })

      it('GET /v8/Customers 200', function (done) {
        request.get({
          url: util.format('%s/api/v8/Customers', testUrl)
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          done()
        })
      })
    })

    describe('custom id location', function () {
      var app = createFn()
      var server
      var customer

      before(function (done) {
        setup(function (err) {
          if (err) {
            return done(err)
          }

          erm.serve(app, db.models.Customer, {
            version: '/v8/Entities/:id',
            restify: app.isRestify
          })

          db.models.Customer.create({
            name: 'Bob'
          }).then(function (createdCustomer) {
            customer = createdCustomer
            server = app.listen(testPort, done)
          }, function (err) {
            done(err)
          })
        })
      })

      after(function (done) {
        dismantle(app, server, done)
      })

      it('GET /v8/Entities/Customers 200', function (done) {
        request.get({
          url: util.format('%s/api/v8/Entities/Customers', testUrl)
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          done()
        })
      })

      it('GET /v8/Entities/:id/Customers 200', function (done) {
        request.get({
          url: util.format('%s/api/v8/Entities/%s/Customers', testUrl, customer._id)
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          done()
        })
      })

      it('GET /v8/Entities/:id/Customers/shallow 200', function (done) {
        request.get({
          url: util.format('%s/api/v8/Entities/%s/Customers/shallow', testUrl, customer._id)
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          done()
        })
      })

      it('GET /v8/Entities/Customers/count 200', function (done) {
        request.get({
          url: util.format('%s/api/v8/Entities/Customers/count', testUrl)
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          done()
        })
      })
    })
  })

  describe('idProperty', function () {
    var app = createFn()
    var server
    var customer

    before(function (done) {
      setup(function (err) {
        if (err) {
          return done(err)
        }

        erm.serve(app, db.models.Customer, {
          idProperty: 'name',
          restify: app.isRestify
        })

        db.models.Customer.create({
          name: 'Bob'
        }).then(function (createdCustomer) {
          customer = createdCustomer
          server = app.listen(testPort, done)
        }, function (err) {
          done(err)
        })
      })
    })

    after(function (done) {
      dismantle(app, server, done)
    })

    it('GET /Customers/:name 200', function (done) {
      request.get({
        url: util.format('%s/api/v1/Customers/%s', testUrl, customer.name),
        json: true
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        assert.equal(body.name, 'Bob')
        done()
      })
    })

    it('POST /Customers/:name 200', function (done) {
      request.post({
        url: util.format('%s/api/v1/Customers/%s', testUrl, customer.name),
        json: {
          age: 12
        }
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        assert.equal(body.name, 'Bob')
        assert.equal(body.age, 12)
        done()
      })
    })

    it('PUT /Customers/:name 200', function (done) {
      request.put({
        url: util.format('%s/api/v1/Customers/%s', testUrl, customer.name),
        json: {
          age: 12
        }
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        assert.equal(body.name, 'Bob')
        assert.equal(body.age, 12)
        done()
      })
    })

    it('DELETE /Customers/:name 204', function (done) {
      request.del({
        url: util.format('%s/api/v1/Customers/%s', testUrl, customer.name)
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 204)
        done()
      })
    })
  })
}
