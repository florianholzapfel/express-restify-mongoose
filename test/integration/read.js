var assert = require('assert')
var mongoose = require('mongoose')
var request = require('request')
var util = require('util')

module.exports = function (createFn) {
  var erm = require('../../lib/express-restify-mongoose')
  var db = require('./setup')()

  var testPort = 30023
  var testUrl = 'http://localhost:' + testPort
  var invalidId = 'invalid-id'
  var randomId = mongoose.Types.ObjectId().toHexString()

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

  describe('Read documents', function () {
    var app = createFn()
    var server
    var customers

    beforeEach(function (done) {
      setup(function (err) {
        if (err) {
          return done(err)
        }

        erm.serve(app, db.models.Customer, {
          outputFn: app.outputFn,
          restify: app.isRestify,
          findOneAndUpdate: false
        })

        db.models.Customer.create([{
          name: 'Bob'
        }, {
          name: 'John'
        }, {
          name: 'Mike'
        }], function (err, createdCustomers) {
          if (err) {
            return done(err)
          }

          customers = createdCustomers
          server = app.listen(testPort, done)
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
        assert.equal(body.length, 3)
        assert.equal(body[0].name, 'Bob')
        assert.equal(body[1].name, 'John')
        assert.equal(body[2].name, 'Mike')
        done()
      })
    })

    it('GET /Customers/:id 200 - created id', function (done) {
      request.get({
        url: util.format('%s/api/v1/Customers/%s', testUrl, customers[0]._id),
        json: true
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        assert.equal(body.name, 'Bob')
        done()
      })
    })

    it('GET /Customers/:id 400 - invalid id', function (done) {
      request.get({
        url: util.format('%s/api/v1/Customers/%s', testUrl, invalidId),
        json: true
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 400)
        done()
      })
    })

    it('GET /Customers/:id 404 - random id', function (done) {
      request.get({
        url: util.format('%s/api/v1/Customers/%s', testUrl, randomId),
        json: true
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 404)
        done()
      })
    })

    describe('count', function () {
      it('GET /Customers/count 200', function (done) {
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

    describe('shallow', function () {
      it('GET /Customers/:id/shallow 200 - created id', function (done) {
        request.get({
          url: util.format('%s/api/v1/Customers/%s/shallow', testUrl, customers[0]._id),
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.name, 'Bob')
          done()
        })
      })

      it('GET /Customers/:id/shallow 400 - invalid id', function (done) {
        request.get({
          url: util.format('%s/api/v1/Customers/%s/shallow', testUrl, invalidId),
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 400)
          done()
        })
      })

      it('GET /Customers/:id/shallow 404 - random id', function (done) {
        request.get({
          url: util.format('%s/api/v1/Customers/%s/shallow', testUrl, randomId),
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 404)
          done()
        })
      })
    })
  })
}
