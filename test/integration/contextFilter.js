var assert = require('assert')
var request = require('request')
var util = require('util')

module.exports = function (createFn, setup, dismantle) {
  var erm = require('../../lib/express-restify-mongoose')
  var db = require('./setup')()

  var testPort = 30023
  var testUrl = 'http://localhost:' + testPort

  describe('contextFilter', function () {
    var app = createFn()
    var server
    var customers

    var contextFilter = function (model, req, done) {
      done(model.find({
        name: { $ne: 'Bob' },
        age: { $lt: 36 }
      }))
    }

    beforeEach(function (done) {
      setup(function (err) {
        if (err) {
          return done(err)
        }

        erm.serve(app, db.models.Customer, {
          contextFilter: contextFilter,
          restify: app.isRestify
        })

        db.models.Customer.create([{
          name: 'Bob',
          age: 12
        }, {
          name: 'John',
          age: 24
        }, {
          name: 'Mike',
          age: 36
        }]).then(function (createdCustomers) {
          customers = createdCustomers
          server = app.listen(testPort, done)
        }, function (err) {
          done(err)
        })
      })
    })

    afterEach(function (done) {
      dismantle(app, server, done)
    })

    it('GET /Customers 200 - filtered name and age', function (done) {
      request.get({
        url: util.format('%s/api/v1/Customers', testUrl),
        json: true
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        assert.equal(body.length, 1)
        assert.equal(body[0].name, 'John')
        assert.equal(body[0].age, 24)
        done()
      })
    })

    it('GET /Customers/:id 404 - filtered name', function (done) {
      request.get({
        url: util.format('%s/api/v1/Customers/%s', testUrl, customers[0]._id),
        json: true
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 404)
        done()
      })
    })

    it('GET /Customers/:id/shallow 404 - filtered age', function (done) {
      request.get({
        url: util.format('%s/api/v1/Customers/%s/shallow', testUrl, customers[2]._id),
        json: true
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 404)
        done()
      })
    })

    it('GET /Customers/count 200 - filtered name and age', function (done) {
      request.get({
        url: util.format('%s/api/v1/Customers/count', testUrl),
        json: true
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        assert.equal(body.count, 1)
        done()
      })
    })

    it('PUT /Customers/:id 200', function (done) {
      request.put({
        url: util.format('%s/api/v1/Customers/%s', testUrl, customers[1]._id),
        json: {
          name: 'Johnny'
        }
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        assert.equal(body.name, 'Johnny')
        done()
      })
    })

    it('PUT /Customers/:id 404 - filtered name', function (done) {
      request.put({
        url: util.format('%s/api/v1/Customers/%s', testUrl, customers[0]._id),
        json: {
          name: 'Bobby'
        }
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 404, 'Wrong status code')

        db.models.Customer.findById(customers[0]._id, function (err, customer) {
          assert.ok(!err)
          assert.notEqual(customer.name, 'Bobby')
          done()
        })
      })
    })

    it('DEL /Customers/:id 200', function (done) {
      request.del({
        url: util.format('%s/api/v1/Customers/%s', testUrl, customers[1]._id),
        json: true
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 204)

        db.models.Customer.findById(customers[1]._id, function (err, customer) {
          assert.ok(!err)
          assert.ok(!customer)
          done()
        })
      })
    })

    it('DEL /Customers/:id 404 - filtered age', function (done) {
      request.del({
        url: util.format('%s/api/v1/Customers/%s', testUrl, customers[2]._id),
        json: true
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 404)

        db.models.Customer.findById(customers[2]._id, function (err, customer) {
          assert.ok(!err)
          assert.ok(customer)
          assert.equal(customer.name, 'Mike')
          done()
        })
      })
    })

    it('DEL /Customers 200 - filtered name and age', function (done) {
      request.del({
        url: util.format('%s/api/v1/Customers', testUrl),
        json: true
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 204)

        db.models.Customer.count(function (err, count) {
          assert.ok(!err)
          assert.equal(count, 2)
          done()
        })
      })
    })
  })
}
