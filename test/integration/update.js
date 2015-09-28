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

  describe('Update documents', function () {
    describe('findOneAndUpdate: true', function () {
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
            findOneAndUpdate: true,
            restify: app.isRestify
          })

          db.models.Customer.create({
            name: 'Bob'
          }).then(function (createdCustomer) {
            customer = createdCustomer

            return db.models.Invoice.create({
              customer: customer._id,
              amount: 100
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

      it('POST /Customers/:id 200 - empty body', function (done) {
        request.post({
          url: util.format('%s/api/v1/Customers/%s', testUrl, customer._id),
          json: {}
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.name, 'Bob')
          done()
        })
      })

      it('POST /Customers/:id 200 - created id', function (done) {
        request.post({
          url: util.format('%s/api/v1/Customers/%s', testUrl, customer._id),
          json: {
            name: 'John'
          }
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.name, 'John')
          done()
        })
      })

      it('POST /Customers/:id 400 - missing content type', function (done) {
        request.post({
          url: util.format('%s/api/v1/Customers/%s', testUrl, customer._id)
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 400)
          done()
        })
      })

      it('POST /Customers/:id 400 - invalid content type', function (done) {
        request.post({
          url: util.format('%s/api/v1/Customers/%s', testUrl, customer._id),
          formData: {
            name: 'John'
          }
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 400)
          done()
        })
      })

      it('POST /Customers/:id 400 - invalid id', function (done) {
        request.post({
          url: util.format('%s/api/v1/Customers/%s', testUrl, invalidId),
          json: {
            name: 'John'
          }
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 400)
          done()
        })
      })

      it('POST /Customers/:id 404 - random id', function (done) {
        request.post({
          url: util.format('%s/api/v1/Customers/%s', testUrl, randomId),
          json: {
            name: 'John'
          }
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 404)
          done()
        })
      })

      it('PUT /Customers 404 (Express), 405 (Restify)', function (done) {
        request.put({
          url: util.format('%s/api/v1/Customers', testUrl),
          json: {}
        }, function (err, res, body) {
          assert.ok(!err)
          if (app.isRestify) {
            assert.equal(res.statusCode, 405)
          } else {
            assert.equal(res.statusCode, 404)
          }
          done()
        })
      })

      it('PUT /Customers/:id 200 - empty body', function (done) {
        request.put({
          url: util.format('%s/api/v1/Customers/%s', testUrl, customer._id),
          json: {}
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.name, 'Bob')
          done()
        })
      })

      it('PUT /Customers/:id 200 - created id', function (done) {
        request.put({
          url: util.format('%s/api/v1/Customers/%s', testUrl, customer._id),
          json: {
            name: 'Mike'
          }
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.name, 'Mike')
          done()
        })
      })

      it('PUT /Customers/:id 400 - missing content type', function (done) {
        request.put({
          url: util.format('%s/api/v1/Customers/%s', testUrl, customer._id)
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 400)
          done()
        })
      })

      it('PUT /Customers/:id 400 - invalid content type', function (done) {
        request.put({
          url: util.format('%s/api/v1/Customers/%s', testUrl, customer._id),
          formData: {
            name: 'John'
          }
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 400)
          done()
        })
      })

      it('PUT /Customers/:id 400 - invalid id', function (done) {
        request.put({
          url: util.format('%s/api/v1/Customers/%s', testUrl, invalidId),
          json: {
            name: 'Mike'
          }
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 400)
          done()
        })
      })

      it('PUT /Customers/:id 404 - random id', function (done) {
        request.put({
          url: util.format('%s/api/v1/Customers/%s', testUrl, randomId),
          json: {
            name: 'Mike'
          }
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 404)
          done()
        })
      })

      describe('populated subdocument', function () {
        it.skip('PUT /Invoices/id 200 - update populated invoice', function (done) {
          request.put({
            url: util.format('%s/api/v1/Invoices/%s', testUrl, invoice._id),
            json: invoice
          }, function (err, res, body) {
            assert.ok(!err)
            assert.equal(res.statusCode, 200)
            assert.equal(body.amount, 200)
            done()
          })
        })
      })
    })

    describe('findOneAndUpdate: false', function () {
      var app = createFn()
      var server
      var customer

      beforeEach(function (done) {
        setup(function (err) {
          if (err) {
            return done(err)
          }

          erm.serve(app, db.models.Customer, {
            findOneAndUpdate: false,
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

      afterEach(function (done) {
        dismantle(app, server, done)
      })

      it('POST /Customers/:id 200 - empty body', function (done) {
        request.post({
          url: util.format('%s/api/v1/Customers/%s', testUrl, customer._id),
          json: {}
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.name, 'Bob')
          done()
        })
      })

      it('POST /Customers/:id 200 - created id', function (done) {
        request.post({
          url: util.format('%s/api/v1/Customers/%s', testUrl, customer._id),
          json: {
            name: 'John'
          }
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.name, 'John')
          done()
        })
      })

      it('POST /Customers/:id 400 - missing content type', function (done) {
        request.post({
          url: util.format('%s/api/v1/Customers/%s', testUrl, customer._id)
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 400)
          done()
        })
      })

      it('POST /Customers/:id 400 - invalid content type', function (done) {
        request.post({
          url: util.format('%s/api/v1/Customers/%s', testUrl, customer._id),
          formData: {
            name: 'John'
          }
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 400)
          done()
        })
      })

      it('POST /Customers/:id 400 - invalid id', function (done) {
        request.post({
          url: util.format('%s/api/v1/Customers/%s', testUrl, invalidId),
          json: {
            name: 'John'
          }
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 400)
          done()
        })
      })

      it('POST /Customers/:id 404 - random id', function (done) {
        request.post({
          url: util.format('%s/api/v1/Customers/%s', testUrl, randomId),
          json: {
            name: 'John'
          }
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 404)
          done()
        })
      })

      it('PUT /Customers 404 (Express), 405 (Restify)', function (done) {
        request.put({
          url: util.format('%s/api/v1/Customers', testUrl),
          json: {}
        }, function (err, res, body) {
          assert.ok(!err)
          if (app.isRestify) {
            assert.equal(res.statusCode, 405)
          } else {
            assert.equal(res.statusCode, 404)
          }
          done()
        })
      })

      it('PUT /Customers/:id 200 - empty body', function (done) {
        request.put({
          url: util.format('%s/api/v1/Customers/%s', testUrl, customer._id),
          json: {}
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.name, 'Bob')
          done()
        })
      })

      it('PUT /Customers/:id 200 - created id', function (done) {
        request.put({
          url: util.format('%s/api/v1/Customers/%s', testUrl, customer._id),
          json: {
            name: 'Mike'
          }
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.name, 'Mike')
          done()
        })
      })

      it('PUT /Customers/:id 400 - missing content type', function (done) {
        request.put({
          url: util.format('%s/api/v1/Customers/%s', testUrl, customer._id)
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 400)
          done()
        })
      })

      it('PUT /Customers/:id 400 - invalid content type', function (done) {
        request.put({
          url: util.format('%s/api/v1/Customers/%s', testUrl, customer._id),
          formData: {
            name: 'John'
          }
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 400)
          done()
        })
      })

      it('PUT /Customers/:id 400 - invalid id', function (done) {
        request.put({
          url: util.format('%s/api/v1/Customers/%s', testUrl, invalidId),
          json: {
            name: 'Mike'
          }
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 400)
          done()
        })
      })

      it('PUT /Customers/:id 404 - random id', function (done) {
        request.put({
          url: util.format('%s/api/v1/Customers/%s', testUrl, randomId),
          json: {
            name: 'Mike'
          }
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 404)
          done()
        })
      })
    })
  })
}
