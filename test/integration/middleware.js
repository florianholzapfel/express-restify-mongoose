var assert = require('assert')
var request = require('request')
var sinon = require('sinon')
var util = require('util')

module.exports = function (createFn, setup, dismantle) {
  var erm = require('../../lib/express-restify-mongoose')
  var db = require('./setup')()

  var testPort = 30023
  var testUrl = 'http://localhost:' + testPort

  describe('preMiddleware', function () {
    var app = createFn()
    var server
    var customer
    var options = {
      preMiddleware: sinon.spy(function (req, res, next) {
        next()
      }),
      restify: app.isRestify
    }

    beforeEach(function (done) {
      setup(function (err) {
        if (err) {
          return done(err)
        }

        erm.serve(app, db.models.Customer, options)

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
      options.preMiddleware.reset()
      dismantle(app, server, done)
    })

    it('GET /Customers 200', function (done) {
      request.get({
        url: util.format('%s/api/v1/Customers', testUrl),
        json: true
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        sinon.assert.calledOnce(options.preMiddleware)
        var args = options.preMiddleware.args[0]
        assert.equal(args.length, 3)
        assert.equal(typeof args[2], 'function')
        done()
      })
    })

    it('GET /Customers/:id 200', function (done) {
      request.get({
        url: util.format('%s/api/v1/Customers', testUrl),
        json: true
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        sinon.assert.calledOnce(options.preMiddleware)
        var args = options.preMiddleware.args[0]
        assert.equal(args.length, 3)
        assert.equal(typeof args[2], 'function')
        done()
      })
    })

    it('POST /Customers 201', function (done) {
      request.post({
        url: util.format('%s/api/v1/Customers', testUrl),
        json: {
          name: 'Pre'
        }
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 201)
        sinon.assert.calledOnce(options.preMiddleware)
        var args = options.preMiddleware.args[0]
        assert.equal(args.length, 3)
        assert.equal(typeof args[2], 'function')
        done()
      })
    })

    it('POST /Customers 400 - not called (missing content type)', function (done) {
      request.post({
        url: util.format('%s/api/v1/Customers', testUrl)
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 400)
        sinon.assert.notCalled(options.preMiddleware)
        done()
      })
    })

    it('POST /Customers 400 - not called (invalid content type)', function (done) {
      request.post({
        url: util.format('%s/api/v1/Customers', testUrl),
        formData: {}
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 400)
        sinon.assert.notCalled(options.preMiddleware)
        done()
      })
    })

    it('POST /Customers/:id 200', function (done) {
      request.post({
        url: util.format('%s/api/v1/Customers/%s', testUrl, customer._id),
        json: {}
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        sinon.assert.calledOnce(options.preMiddleware)
        var args = options.preMiddleware.args[0]
        assert.equal(args.length, 3)
        assert.equal(typeof args[2], 'function')
        done()
      })
    })

    it('POST /Customers/:id 400 - not called (missing content type)', function (done) {
      request.post({
        url: util.format('%s/api/v1/Customers/%s', testUrl, customer._id)
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 400)
        sinon.assert.notCalled(options.preMiddleware)
        done()
      })
    })

    it('POST /Customers/:id 400 - not called (invalid content type)', function (done) {
      request.post({
        url: util.format('%s/api/v1/Customers/%s', testUrl, customer._id),
        formData: {}
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 400)
        sinon.assert.notCalled(options.preMiddleware)
        done()
      })
    })

    it('PUT /Customers/:id 200', function (done) {
      request.put({
        url: util.format('%s/api/v1/Customers/%s', testUrl, customer._id),
        json: {}
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        sinon.assert.calledOnce(options.preMiddleware)
        var args = options.preMiddleware.args[0]
        assert.equal(args.length, 3)
        assert.equal(typeof args[2], 'function')
        done()
      })
    })

    it('PUT /Customers/:id 400 - not called (missing content type)', function (done) {
      request.put({
        url: util.format('%s/api/v1/Customers/%s', testUrl, customer._id)
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 400)
        sinon.assert.notCalled(options.preMiddleware)
        done()
      })
    })

    it('PUT /Customers/:id 400 - not called (invalid content type)', function (done) {
      request.put({
        url: util.format('%s/api/v1/Customers/%s', testUrl, customer._id),
        formData: {}
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 400)
        sinon.assert.notCalled(options.preMiddleware)
        done()
      })
    })

    it('DELETE /Customers 204', function (done) {
      request.del({
        url: util.format('%s/api/v1/Customers', testUrl),
        json: true
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 204)
        sinon.assert.calledOnce(options.preMiddleware)
        var args = options.preMiddleware.args[0]
        assert.equal(args.length, 3)
        assert.equal(typeof args[2], 'function')
        done()
      })
    })

    it('DELETE /Customers/:id 204', function (done) {
      request.del({
        url: util.format('%s/api/v1/Customers/%s', testUrl, customer._id),
        json: true
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 204)
        sinon.assert.calledOnce(options.preMiddleware)
        var args = options.preMiddleware.args[0]
        assert.equal(args.length, 3)
        assert.equal(typeof args[2], 'function')
        done()
      })
    })
  })

  describe('postMiddleware', function () {
    var app = createFn()
    var server
    var customer
    var options = {
      postMiddleware: sinon.spy(function (req, res, next) {
        next()
      }),
      restify: app.isRestify
    }

    beforeEach(function (done) {
      setup(function (err) {
        if (err) {
          return done(err)
        }

        erm.serve(app, db.models.Customer, options)

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
      options.postMiddleware.reset()
      dismantle(app, server, done)
    })

    it('GET /Customers 200', function (done) {
      request.get({
        url: util.format('%s/api/v1/Customers', testUrl),
        json: true
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        sinon.assert.calledOnce(options.postMiddleware)
        var args = options.postMiddleware.args[0]
        assert.equal(args.length, 4)
        assert.equal(typeof args[2], 'function')
        done()
      })
    })

    it('GET /Customers/:id 200', function (done) {
      request.get({
        url: util.format('%s/api/v1/Customers', testUrl),
        json: true
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        sinon.assert.calledOnce(options.postMiddleware)
        var args = options.postMiddleware.args[0]
        assert.equal(args.length, 4)
        assert.equal(typeof args[2], 'function')
        done()
      })
    })

    it('POST /Customers 201', function (done) {
      request.post({
        url: util.format('%s/api/v1/Customers', testUrl),
        json: {
          name: 'Post'
        }
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 201)
        sinon.assert.calledOnce(options.postMiddleware)
        var args = options.postMiddleware.args[0]
        assert.equal(args.length, 4)
        assert.equal(typeof args[2], 'function')
        done()
      })
    })

    it('POST /Customers/:id 200', function (done) {
      request.post({
        url: util.format('%s/api/v1/Customers/%s', testUrl, customer._id),
        json: {}
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        sinon.assert.calledOnce(options.postMiddleware)
        var args = options.postMiddleware.args[0]
        assert.equal(args.length, 4)
        assert.equal(typeof args[2], 'function')
        done()
      })
    })

    it('POST /Customers/:id 400 - not called (missing content type)', function (done) {
      request.post({
        url: util.format('%s/api/v1/Customers/%s', testUrl, customer._id)
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 400)
        sinon.assert.notCalled(options.postMiddleware)
        done()
      })
    })

    it('POST /Customers/:id 400 - not called (invalid content type)', function (done) {
      request.post({
        url: util.format('%s/api/v1/Customers/%s', testUrl, customer._id),
        formData: {}
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 400)
        sinon.assert.notCalled(options.postMiddleware)
        done()
      })
    })

    it('PUT /Customers/:id 200', function (done) {
      request.put({
        url: util.format('%s/api/v1/Customers/%s', testUrl, customer._id),
        json: {}
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        sinon.assert.calledOnce(options.postMiddleware)
        var args = options.postMiddleware.args[0]
        assert.equal(args.length, 4)
        assert.equal(typeof args[2], 'function')
        done()
      })
    })

    it('PUT /Customers/:id 400 - not called (missing content type)', function (done) {
      request.put({
        url: util.format('%s/api/v1/Customers/%s', testUrl, customer._id)
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 400)
        sinon.assert.notCalled(options.postMiddleware)
        done()
      })
    })

    it('PUT /Customers/:id 400 - not called (invalid content type)', function (done) {
      request.put({
        url: util.format('%s/api/v1/Customers/%s', testUrl, customer._id),
        formData: {}
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 400)
        sinon.assert.notCalled(options.postMiddleware)
        done()
      })
    })

    it('DELETE /Customers/:id 204', function (done) {
      request.del({
        url: util.format('%s/api/v1/Customers/%s', testUrl, customer._id),
        json: true
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 204)
        sinon.assert.calledOnce(options.postMiddleware)
        var args = options.postMiddleware.args[0]
        assert.equal(args.length, 4)
        assert.equal(typeof args[2], 'function')
        done()
      })
    })

    it('DELETE /Customers 204', function (done) {
      request.del({
        url: util.format('%s/api/v1/Customers', testUrl),
        json: true
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 204)
        sinon.assert.calledOnce(options.postMiddleware)
        var args = options.postMiddleware.args[0]
        assert.equal(args.length, 4)
        assert.equal(typeof args[2], 'function')
        done()
      })
    })
  })
}
