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

  describe('virtuals', function () {
    var app = createFn()
    var server

    beforeEach(function (done) {
      setup(function (err) {
        if (err) {
          return done(err)
        }

        erm.serve(app, db.models.Customer, {
          lean: false,
          restify: app.isRestify
        })

        db.models.Customer.create({
          name: 'Bob'
        }).then(function (createdCustomers) {
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
        assert.equal(body[0].info, 'Bob is awesome')
        done()
      })
    })
  })
}
