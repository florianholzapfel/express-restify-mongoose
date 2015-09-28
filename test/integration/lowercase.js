var assert = require('assert')
var request = require('request')
var util = require('util')

module.exports = function (createFn, setup, dismantle) {
  var erm = require('../../lib/express-restify-mongoose')
  var db = require('./setup')()

  var testPort = 30023
  var testUrl = 'http://localhost:' + testPort

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

        db.models.Customer.create({
          name: 'Bob'
        }).then(function (createdCustomer) {
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
        if (app.isRestify) {
          assert.equal(res.statusCode, 404)
        } else {
          assert.equal(res.statusCode, 200)
        }
        done()
      })
    })
  })
}
