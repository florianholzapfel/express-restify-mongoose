var assert = require('assert')
var request = require('request')
var util = require('util')

module.exports = function (createFn) {
  var erm = require('../../lib/express-restify-mongoose')
  var db = require('./setup')()

  var testPort = 30023
  var testUrl = 'http://localhost:' + testPort

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

  describe('access', function () {
    describe('private - include private and protected fields', function () {
      var app = createFn()
      var server
      var customer
      var invoice

      beforeEach(function (done) {
        setup(function (err) {
          if (err) {
            return done(err)
          }

          erm.serve(app, db.models.Customer, {
            private: ['age', 'favorites.animal', 'privateDoes.notExist'],
            protected: ['comment', 'favorites.color', 'protectedDoes.notExist'],
            access: function (req, done) {
              done(null, 'private')
            },
            restify: app.isRestify
          })

          erm.serve(app, db.models.Invoice, {
            private: ['amount'],
            protected: ['receipt'],
            access: function () {
              return 'private'
            },
            restify: app.isRestify
          })

          db.models.Customer.create({
            name: 'Bob',
            age: 12,
            comment: 'Boo',
            favorites: {
              animal: 'Boar',
              color: 'Black'
            }
          }).then(function (createdCustomer) {
            customer = createdCustomer

            return db.models.Invoice.create({
              customer: customer._id,
              amount: 100,
              receipt: 'A'
            })
          }).then(function (createdInvoice) {
            invoice = createdInvoice
            server = app.listen(testPort, done)
          }, function (err) {
            done(err)
          })
        })
      })

      afterEach(function (done) {
        dismantle(app, server, done)
      })

      it('GET /Customers 200', function (done) {
        request.get({
          url: util.format('%s/api/v1/Customers', testUrl),
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.length, 1)
          assert.equal(body[0].name, 'Bob')
          assert.equal(body[0].age, 12)
          assert.equal(body[0].comment, 'Boo')
          assert.deepEqual(body[0].favorites, {
            animal: 'Boar',
            color: 'Black'
          })
          done()
        })
      })

      it('GET /Customers/:id 200', function (done) {
        request.get({
          url: util.format('%s/api/v1/Customers/%s', testUrl, customer._id),
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.name, 'Bob')
          assert.equal(body.age, 12)
          assert.equal(body.comment, 'Boo')
          assert.deepEqual(body.favorites, {
            animal: 'Boar',
            color: 'Black'
          })
          done()
        })
      })

      it('GET /Invoices?populate=customer 200', function (done) {
        request.get({
          url: util.format('%s/api/v1/Invoices', testUrl),
          qs: {
            populate: 'customer'
          },
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(body.length, 1)
          assert.ok(body[0].customer)
          assert.equal(body[0].amount, 100)
          assert.equal(body[0].receipt, 'A')
          assert.equal(body[0].customer.name, 'Bob')
          assert.equal(body[0].customer.age, 12)
          assert.equal(body[0].customer.comment, 'Boo')
          assert.deepEqual(body[0].customer.favorites, {
            animal: 'Boar',
            color: 'Black'
          })
          done()
        })
      })

      it('GET /Invoices?populate=customer 200', function (done) {
        request.get({
          url: util.format('%s/api/v1/Invoices/%s', testUrl, invoice._id),
          qs: {
            populate: 'customer'
          },
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          assert.ok(body.customer)
          assert.equal(body.amount, 100)
          assert.equal(body.receipt, 'A')
          assert.equal(body.customer.name, 'Bob')
          assert.equal(body.customer.age, 12)
          assert.equal(body.customer.comment, 'Boo')
          assert.deepEqual(body.customer.favorites, {
            animal: 'Boar',
            color: 'Black'
          })
          done()
        })
      })
    })

    describe('protected - exclude private fields and include protected fields', function () {
      var app = createFn()
      var server
      var customer
      var invoice

      beforeEach(function (done) {
        setup(function (err) {
          if (err) {
            return done(err)
          }

          erm.serve(app, db.models.Customer, {
            private: ['age', 'favorites.animal', 'privateDoes.notExist'],
            protected: ['comment', 'favorites.color', 'protectedDoes.notExist'],
            access: function (req, done) {
              done(null, 'protected')
            },
            restify: app.isRestify
          })

          erm.serve(app, db.models.Invoice, {
            private: ['amount'],
            protected: ['receipt'],
            access: function () {
              return 'protected'
            },
            restify: app.isRestify
          })

          db.models.Customer.create({
            name: 'Bob',
            age: 12,
            comment: 'Boo',
            favorites: {
              animal: 'Boar',
              color: 'Black'
            }
          }).then(function (createdCustomer) {
            customer = createdCustomer

            return db.models.Invoice.create({
              customer: customer._id,
              amount: 100,
              receipt: 'A'
            })
          }).then(function (createdInvoice) {
            invoice = createdInvoice
            server = app.listen(testPort, done)
          }, function (err) {
            done(err)
          })
        })
      })

      afterEach(function (done) {
        dismantle(app, server, done)
      })

      it('GET /Customers 200', function (done) {
        request.get({
          url: util.format('%s/api/v1/Customers', testUrl),
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.length, 1)
          assert.equal(body[0].name, 'Bob')
          assert.equal(body[0].age, undefined)
          assert.equal(body[0].comment, 'Boo')
          assert.deepEqual(body[0].favorites, {
            color: 'Black'
          })
          done()
        })
      })

      it('GET /Customers/:id 200', function (done) {
        request.get({
          url: util.format('%s/api/v1/Customers/%s', testUrl, customer._id),
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.name, 'Bob')
          assert.equal(body.age, undefined)
          assert.equal(body.comment, 'Boo')
          assert.deepEqual(body.favorites, {
            color: 'Black'
          })
          done()
        })
      })

      it('GET /Invoices?populate=customer 200', function (done) {
        request.get({
          url: util.format('%s/api/v1/Invoices', testUrl),
          qs: {
            populate: 'customer'
          },
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(body.length, 1)
          assert.ok(body[0].customer)
          assert.equal(body[0].amount, undefined)
          assert.equal(body[0].receipt, 'A')
          assert.equal(body[0].customer.name, 'Bob')
          assert.equal(body[0].customer.age, undefined)
          assert.equal(body[0].customer.comment, 'Boo')
          assert.deepEqual(body[0].customer.favorites, {
            color: 'Black'
          })
          done()
        })
      })

      it('GET /Invoices?populate=customer 200', function (done) {
        request.get({
          url: util.format('%s/api/v1/Invoices/%s', testUrl, invoice._id),
          qs: {
            populate: 'customer'
          },
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          assert.ok(body.customer)
          assert.equal(body.amount, undefined)
          assert.equal(body.receipt, 'A')
          assert.equal(body.customer.name, 'Bob')
          assert.equal(body.customer.age, undefined)
          assert.equal(body.customer.comment, 'Boo')
          assert.deepEqual(body.customer.favorites, {
            color: 'Black'
          })
          done()
        })
      })
    })

    describe('public - exclude private and protected fields', function () {
      var app = createFn()
      var server
      var customer
      var invoice

      beforeEach(function (done) {
        setup(function (err) {
          if (err) {
            return done(err)
          }

          erm.serve(app, db.models.Customer, {
            private: ['age', 'favorites.animal', 'privateDoes.notExist'],
            protected: ['comment', 'favorites.color', 'protectedDoes.notExist'],
            restify: app.isRestify
          })

          erm.serve(app, db.models.Invoice, {
            private: ['amount'],
            protected: ['receipt'],
            restify: app.isRestify
          })

          db.models.Customer.create({
            name: 'Bob',
            age: 12,
            comment: 'Boo',
            favorites: {
              animal: 'Boar',
              color: 'Black'
            }
          }).then(function (createdCustomer) {
            customer = createdCustomer

            return db.models.Invoice.create({
              customer: customer._id,
              amount: 100,
              receipt: 'A'
            })
          }).then(function (createdInvoice) {
            invoice = createdInvoice
            server = app.listen(testPort, done)
          }, function (err) {
            done(err)
          })
        })
      })

      afterEach(function (done) {
        dismantle(app, server, done)
      })

      it('GET /Customers 200', function (done) {
        request.get({
          url: util.format('%s/api/v1/Customers', testUrl),
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.length, 1)
          assert.equal(body[0].name, 'Bob')
          assert.equal(body[0].age, undefined)
          assert.equal(body[0].comment, undefined)
          assert.deepEqual(body[0].favorites, {})
          done()
        })
      })

      it('GET /Customers/:id 200', function (done) {
        request.get({
          url: util.format('%s/api/v1/Customers/%s', testUrl, customer._id),
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.name, 'Bob')
          assert.equal(body.age, undefined)
          assert.equal(body.comment, undefined)
          assert.deepEqual(body.favorites, {})
          done()
        })
      })

      it('GET /Invoices?populate=customer 200', function (done) {
        request.get({
          url: util.format('%s/api/v1/Invoices', testUrl),
          qs: {
            populate: 'customer'
          },
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(body.length, 1)
          assert.ok(body[0].customer)
          assert.equal(body[0].amount, undefined)
          assert.equal(body[0].receipt, undefined)
          assert.equal(body[0].customer.name, 'Bob')
          assert.equal(body[0].customer.age, undefined)
          assert.equal(body[0].customer.comment, undefined)
          assert.deepEqual(body[0].customer.favorites, {})
          done()
        })
      })

      it('GET /Invoices?populate=customer 200', function (done) {
        request.get({
          url: util.format('%s/api/v1/Invoices/%s', testUrl, invoice._id),
          qs: {
            populate: 'customer'
          },
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          assert.ok(body.customer)
          assert.equal(body.amount, undefined)
          assert.equal(body.receipt, undefined)
          assert.equal(body.customer.name, 'Bob')
          assert.equal(body.customer.age, undefined)
          assert.equal(body.customer.comment, undefined)
          assert.deepEqual(body.customer.favorites, {})
          done()
        })
      })
    })
  })
}
