var assert = require('assert')
var mongoose = require('mongoose')
var request = require('request')
var util = require('util')

module.exports = function (createFn, setup, dismantle) {
  var erm = require('../../lib/express-restify-mongoose')
  var db = require('./setup')()

  var testPort = 30023
  var testUrl = 'http://localhost:' + testPort
  var invalidId = 'invalid-id'
  var randomId = mongoose.Types.ObjectId().toHexString()

  describe('Create documents', function () {
    var app = createFn()
    var server
    var customer, product

    beforeEach(function (done) {
      setup(function (err) {
        if (err) {
          return done(err)
        }

        erm.serve(app, db.models.Customer, {
          restify: app.isRestify
        })

        erm.serve(app, db.models.Invoice, {
          restify: app.isRestify
        })

        erm.serve(app, db.models.Product, {
          restify: app.isRestify
        })

        db.models.Customer.create({
          name: 'Bob'
        }).then(function (createdCustomer) {
          customer = createdCustomer

          return db.models.Product.create({
            name: 'Bobsleigh'
          })
        }).then(function (createdProduct) {
          product = createdProduct
          server = app.listen(testPort, done)
        }, function (err) {
          done(err)
        })
      })
    })

    afterEach(function (done) {
      dismantle(app, server, done)
    })

    it('POST /Customers 201', function (done) {
      request.post({
        url: util.format('%s/api/v1/Customers', testUrl),
        json: {
          name: 'John'
        }
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 201)
        assert.ok(body._id)
        assert.equal(body.name, 'John')
        done()
      })
    })

    it('POST /Customers 201 - ignore _id', function (done) {
      request.post({
        url: util.format('%s/api/v1/Customers', testUrl),
        json: {
          _id: randomId,
          name: 'John'
        }
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 201)
        assert.ok(body._id)
        assert.ok(body._id !== randomId)
        assert.equal(body.name, 'John')
        done()
      })
    })

    it('POST /Customers 201 - ignore __v', function (done) {
      request.post({
        url: util.format('%s/api/v1/Customers', testUrl),
        json: {
          __v: '1',
          name: 'John'
        }
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 201)
        assert.ok(body._id)
        assert.ok(body.__v === 0)
        assert.equal(body.name, 'John')
        done()
      })
    })

    it('POST /Customers 201 - array', function (done) {
      request.post({
        url: util.format('%s/api/v1/Customers', testUrl),
        json: [{
          name: 'John'
        }, {
          name: 'Mike'
        }]
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 201)
        assert.ok(Array.isArray(body))
        assert.ok(body.length, 2)
        assert.ok(body[0]._id)
        assert.equal(body[0].name, 'John')
        assert.ok(body[1]._id)
        assert.equal(body[1].name, 'Mike')
        done()
      })
    })

    it('POST /Customers 400 - validation error', function (done) {
      request.post({
        url: util.format('%s/api/v1/Customers', testUrl),
        json: {}
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 400)
        assert.equal(body.name, 'ValidationError')
        assert.equal(Object.keys(body.errors).length, 1)
        assert.ok(body.errors['name'])
        done()
      })
    })

    it('POST /Customers 400 - missing content type', function (done) {
      request.post({
        url: util.format('%s/api/v1/Customers', testUrl)
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 400)
        assert.equal(JSON.parse(body).description, 'missing_content_type')
        done()
      })
    })

    it('POST /Customers 400 - invalid content type', function (done) {
      request.post({
        url: util.format('%s/api/v1/Customers', testUrl),
        formData: {}
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 400)
        assert.equal(JSON.parse(body).description, 'invalid_content_type')
        done()
      })
    })

    it('POST /Invoices 201 - referencing customer and product ids', function (done) {
      request.post({
        url: util.format('%s/api/v1/Invoices', testUrl),
        json: {
          customer: customer._id,
          products: product._id,
          amount: 42
        }
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 201)
        assert.ok(body._id)
        assert.equal(body.customer, customer._id)
        assert.equal(body.amount, 42)
        done()
      })
    })

    it('POST /Invoices 201 - referencing customer and products ids', function (done) {
      request.post({
        url: util.format('%s/api/v1/Invoices', testUrl),
        json: {
          customer: customer._id,
          products: [product._id, product._id],
          amount: 42
        }
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 201)
        assert.ok(body._id)
        assert.equal(body.customer, customer._id)
        assert.equal(body.amount, 42)
        done()
      })
    })

    it('POST /Invoices 201 - referencing customer and product', function (done) {
      request.post({
        url: util.format('%s/api/v1/Invoices', testUrl),
        json: {
          customer: customer,
          products: product,
          amount: 42
        }
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 201)
        assert.ok(body._id)
        assert.equal(body.customer, customer._id)
        assert.equal(body.amount, 42)
        done()
      })
    })

    it('POST /Invoices 201 - referencing customer and products', function (done) {
      request.post({
        url: util.format('%s/api/v1/Invoices', testUrl),
        json: {
          customer: customer,
          products: [product, product],
          amount: 42
        }
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 201)
        assert.ok(body._id)
        assert.equal(body.customer, customer._id)
        assert.equal(body.amount, 42)
        done()
      })
    })

    it('POST /Invoices 400 - referencing invalid customer and products ids', function (done) {
      request.post({
        url: util.format('%s/api/v1/Invoices', testUrl),
        json: {
          customer: invalidId,
          products: [invalidId, invalidId],
          amount: 42
        }
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 400)
        assert.equal(body.name, 'ValidationError')
        assert.equal(Object.keys(body.errors).length, 2)
        assert.ok(body.errors['customer'])
        assert.ok(body.errors['products'])
        done()
      })
    })
  })
}
