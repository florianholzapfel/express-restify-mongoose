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
      var customers
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

          erm.serve(app, db.models.Invoice, {
            findOneAndUpdate: true,
            restify: app.isRestify
          })

          db.models.Customer.create([{
            name: 'Bob'
          }, {
            name: 'John'
          }]).then(function (createdCustomers) {
            customers = createdCustomers

            return db.models.Product.create([{
              name: 'Bobsleigh'
            }, {
              name: 'Jacket'
            }])
          }).then(function (createdProducts) {
            return db.models.Invoice.create({
              customer: customers[0]._id,
              products: createdProducts,
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
          url: util.format('%s/api/v1/Customers/%s', testUrl, customers[0]._id),
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
          url: util.format('%s/api/v1/Customers/%s', testUrl, customers[0]._id),
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

      it('POST /Customers/:id 400 - cast error', function (done) {
        request.post({
          url: util.format('%s/api/v1/Customers/%s', testUrl, customers[0]._id),
          json: {
            age: 'not a number'
          }
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 400)
          assert.equal(body.name, 'CastError')
          assert.equal(body.path, 'age')
          done()
        })
      })

      it('POST /Customers/:id 400 - mongo error', function (done) {
        request.post({
          url: util.format('%s/api/v1/Customers/%s', testUrl, customers[0]._id),
          json: {
            name: 'John'
          }
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 400)
          assert.equal(body.name, 'MongoError')
          assert.ok(body.code === 11000 || body.code === 11001)
          done()
        })
      })

      it('POST /Customers/:id 400 - missing content type', function (done) {
        request.post({
          url: util.format('%s/api/v1/Customers/%s', testUrl, customers[0]._id)
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 400)
          assert.equal(JSON.parse(body).description, 'missing_content_type')
          done()
        })
      })

      it('POST /Customers/:id 400 - invalid content type', function (done) {
        request.post({
          url: util.format('%s/api/v1/Customers/%s', testUrl, customers[0]._id),
          formData: {}
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 400)
          assert.equal(JSON.parse(body).description, 'invalid_content_type')
          done()
        })
      })

      it('POST /Customers/:id 400 - invalid id', function (done) {
        request.post({
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

      it('POST /Customers/:id 404 - random id', function (done) {
        request.post({
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
          url: util.format('%s/api/v1/Customers/%s', testUrl, customers[0]._id),
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
          url: util.format('%s/api/v1/Customers/%s', testUrl, customers[0]._id),
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

      it('PUT /Customers/:id 400 - cast error', function (done) {
        request.put({
          url: util.format('%s/api/v1/Customers/%s', testUrl, customers[0]._id),
          json: {
            age: 'not a number'
          }
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 400)
          assert.equal(body.name, 'CastError')
          assert.equal(body.path, 'age')
          done()
        })
      })

      it('PUT /Customers/:id 400 - mongo error', function (done) {
        request.put({
          url: util.format('%s/api/v1/Customers/%s', testUrl, customers[0]._id),
          json: {
            name: 'John'
          }
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 400)
          assert.equal(body.name, 'MongoError')
          assert.ok(body.code === 11000 || body.code === 11001)
          done()
        })
      })

      it('PUT /Customers/:id 400 - missing content type', function (done) {
        request.put({
          url: util.format('%s/api/v1/Customers/%s', testUrl, customers[0]._id)
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 400)
          done()
        })
      })

      it('PUT /Customers/:id 400 - invalid content type', function (done) {
        request.put({
          url: util.format('%s/api/v1/Customers/%s', testUrl, customers[0]._id),
          formData: {
            name: 'Mike'
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
        it('PUT /Invoices/:id 200 - update with populated customer', function (done) {
          db.models.Invoice.findById(invoice._id).populate('customer').exec().then(function (invoice) {
            assert.notEqual(invoice.amount, 200)
            invoice.amount = 200

            request.put({
              url: util.format('%s/api/v1/Invoices/%s', testUrl, invoice._id),
              json: invoice
            }, function (err, res, body) {
              assert.ok(!err)
              assert.equal(res.statusCode, 200)
              assert.equal(body.amount, 200)
              assert.equal(body.customer, invoice.customer._id)
              done()
            })
          }, function (err) {
            done(err)
          })
        })

        it('PUT /Invoices/:id 200 - update with populated products', function (done) {
          db.models.Invoice.findById(invoice._id).populate('products').exec().then(function (invoice) {
            assert.notEqual(invoice.amount, 200)
            invoice.amount = 200

            request.put({
              url: util.format('%s/api/v1/Invoices/%s', testUrl, invoice._id),
              json: invoice
            }, function (err, res, body) {
              assert.ok(!err)
              assert.equal(res.statusCode, 200)
              assert.equal(body.amount, 200)
              assert.deepEqual(body.products, [invoice.products[0]._id.toHexString(), invoice.products[1]._id.toHexString()])
              done()
            })
          }, function (err) {
            done(err)
          })
        })
      })
    })

    describe('findOneAndUpdate: false', function () {
      var app = createFn()
      var server
      var customers
      var invoice

      beforeEach(function (done) {
        setup(function (err) {
          if (err) {
            return done(err)
          }

          erm.serve(app, db.models.Customer, {
            findOneAndUpdate: false,
            restify: app.isRestify
          })

          erm.serve(app, db.models.Invoice, {
            findOneAndUpdate: false,
            restify: app.isRestify
          })

          db.models.Customer.create([{
            name: 'Bob'
          }, {
            name: 'John'
          }]).then(function (createdCustomers) {
            customers = createdCustomers

            return db.models.Product.create([{
              name: 'Bobsleigh'
            }, {
              name: 'Jacket'
            }])
          }).then(function (createdProducts) {
            return db.models.Invoice.create({
              customer: customers[0]._id,
              products: createdProducts,
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
          url: util.format('%s/api/v1/Customers/%s', testUrl, customers[0]._id),
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
          url: util.format('%s/api/v1/Customers/%s', testUrl, customers[0]._id),
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

      it('POST /Customers/:id 400 - validation error', function (done) {
        request.post({
          url: util.format('%s/api/v1/Customers/%s', testUrl, customers[0]._id),
          json: {
            age: 'not a number'
          }
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 400)
          assert.equal(body.name, 'ValidationError')
          assert.equal(Object.keys(body.errors).length, 1)
          assert.ok(body.errors['age'])
          done()
        })
      })

      it('POST /Customers/:id 400 - mongo error', function (done) {
        request.post({
          url: util.format('%s/api/v1/Customers/%s', testUrl, customers[0]._id),
          json: {
            name: 'John'
          }
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 400)
          assert.equal(body.name, 'MongoError')
          assert.ok(body.code === 11000 || body.code === 11001)
          done()
        })
      })

      it('POST /Customers/:id 400 - missing content type', function (done) {
        request.post({
          url: util.format('%s/api/v1/Customers/%s', testUrl, customers[0]._id)
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 400)
          done()
        })
      })

      it('POST /Customers/:id 400 - invalid content type', function (done) {
        request.post({
          url: util.format('%s/api/v1/Customers/%s', testUrl, customers[0]._id),
          formData: {
            name: 'Mike'
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
            name: 'Mike'
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
            name: 'Mike'
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
          url: util.format('%s/api/v1/Customers/%s', testUrl, customers[0]._id),
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
          url: util.format('%s/api/v1/Customers/%s', testUrl, customers[0]._id),
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

      it('PUT /Customers/:id 400 - validation error', function (done) {
        request.put({
          url: util.format('%s/api/v1/Customers/%s', testUrl, customers[0]._id),
          json: {
            age: 'not a number'
          }
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 400)
          assert.equal(body.name, 'ValidationError')
          assert.equal(Object.keys(body.errors).length, 1)
          assert.ok(body.errors['age'])
          done()
        })
      })

      it('PUT /Customers/:id 400 - mongo error', function (done) {
        request.put({
          url: util.format('%s/api/v1/Customers/%s', testUrl, customers[0]._id),
          json: {
            name: 'John'
          }
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 400)
          assert.equal(body.name, 'MongoError')
          assert.ok(body.code === 11000 || body.code === 11001)
          done()
        })
      })

      it('PUT /Customers/:id 400 - missing content type', function (done) {
        request.put({
          url: util.format('%s/api/v1/Customers/%s', testUrl, customers[0]._id)
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 400)
          done()
        })
      })

      it('PUT /Customers/:id 400 - invalid content type', function (done) {
        request.put({
          url: util.format('%s/api/v1/Customers/%s', testUrl, customers[0]._id),
          formData: {
            name: 'Mike'
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
        it('PUT /Invoices/:id 200 - update with populated customer', function (done) {
          db.models.Invoice.findById(invoice._id).populate('customer').exec().then(function (invoice) {
            assert.notEqual(invoice.amount, 200)
            invoice.amount = 200

            request.put({
              url: util.format('%s/api/v1/Invoices/%s', testUrl, invoice._id),
              json: invoice
            }, function (err, res, body) {
              assert.ok(!err)
              assert.equal(res.statusCode, 200)
              assert.equal(body.amount, 200)
              assert.equal(body.customer, invoice.customer._id)
              done()
            })
          }, function (err) {
            done(err)
          })
        })

        it('PUT /Invoices/:id 200 - update with populated products', function (done) {
          db.models.Invoice.findById(invoice._id).populate('products').exec().then(function (invoice) {
            assert.notEqual(invoice.amount, 200)
            invoice.amount = 200

            request.put({
              url: util.format('%s/api/v1/Invoices/%s', testUrl, invoice._id),
              json: invoice
            }, function (err, res, body) {
              assert.ok(!err)
              assert.equal(res.statusCode, 200)
              assert.equal(body.amount, 200)
              assert.deepEqual(body.products, [invoice.products[0]._id.toHexString(), invoice.products[1]._id.toHexString()])
              done()
            })
          }, function (err) {
            done(err)
          })
        })
      })
    })
  })
}
