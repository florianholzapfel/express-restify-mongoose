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

  describe('Delete documents', function () {
    describe('findOneAndRemove: true', function () {
      var app = createFn()
      var server
      var customer

      beforeEach(function (done) {
        setup(function (err) {
          if (err) {
            return done(err)
          }

          erm.serve(app, db.models.Customer, {
            findOneAndRemove: true,
            restify: app.isRestify
          })

          db.models.Customer.create([{
            name: 'Bob'
          }, {
            name: 'John'
          }, {
            name: 'Mike'
          }]).then(function (createdCustomers) {
            customer = createdCustomers[0]
            server = app.listen(testPort, done)
          }, function (err) {
            done(err)
          })
        })
      })

      afterEach(function (done) {
        dismantle(app, server, done)
      })

      it('DELETE /Customers 204 - no id', function (done) {
        request.del({
          url: util.format('%s/api/v1/Customers', testUrl)
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 204)
          done()
        })
      })

      it('DELETE /Customers/:id 204 - created id', function (done) {
        request.del({
          url: util.format('%s/api/v1/Customers/%s', testUrl, customer._id)
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 204)
          done()
        })
      })

      it('DELETE /Customers/:id 400 - invalid id', function (done) {
        request.del({
          url: util.format('%s/api/v1/Customers/%s', testUrl, invalidId)
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 400)
          done()
        })
      })

      it('DELETE /Customers/:id 404 - random id', function (done) {
        request.del({
          url: util.format('%s/api/v1/Customers/%s', testUrl, randomId)
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 404)
          done()
        })
      })

      it('DELETE /Customers?query={"name":"John"} 200 - exact match', function (done) {
        request.del({
          url: util.format('%s/api/v1/Customers', testUrl),
          qs: {
            query: JSON.stringify({
              name: 'John'
            })
          },
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 204)

          db.models.Customer.find({}, function (err, customers) {
            assert.equal(customers.length, 2)
            assert.ok(customers[0].name !== 'John')
            assert.ok(customers[1].name !== 'John')
            done(err)
          })
        })
      })
    })

    describe('findOneAndRemove: false', function () {
      var app = createFn()
      var server
      var customer

      beforeEach(function (done) {
        setup(function (err) {
          if (err) {
            return done(err)
          }

          erm.serve(app, db.models.Customer, {
            findOneAndRemove: false,
            restify: app.isRestify
          })

          db.models.Customer.create([{
            name: 'Bob'
          }, {
            name: 'John'
          }, {
            name: 'Mike'
          }]).then(function (createdCustomers) {
            customer = createdCustomers[0]
            server = app.listen(testPort, done)
          }, function (err) {
            done(err)
          })
        })
      })

      afterEach(function (done) {
        dismantle(app, server, done)
      })

      it('DELETE /Customers 204 - no id', function (done) {
        request.del({
          url: util.format('%s/api/v1/Customers', testUrl)
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 204)
          done()
        })
      })

      it('DELETE /Customers/:id 204 - created id', function (done) {
        request.del({
          url: util.format('%s/api/v1/Customers/%s', testUrl, customer._id)
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 204)
          done()
        })
      })

      it('DELETE /Customers/:id 400 - invalid id', function (done) {
        request.del({
          url: util.format('%s/api/v1/Customers/%s', testUrl, invalidId)
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 400)
          done()
        })
      })

      it('DELETE /Customers/:id 404 - random id', function (done) {
        request.del({
          url: util.format('%s/api/v1/Customers/%s', testUrl, randomId)
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 404)
          done()
        })
      })

      it('DELETE /Customers?query={"name":"John"} 200 - exact match', function (done) {
        request.del({
          url: util.format('%s/api/v1/Customers', testUrl),
          qs: {
            query: JSON.stringify({
              name: 'John'
            })
          },
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 204)

          db.models.Customer.find({}, function (err, customers) {
            assert.equal(customers.length, 2)
            assert.ok(customers[0].name !== 'John')
            assert.ok(customers[1].name !== 'John')
            done(err)
          })
        })
      })
    })
  })
}
