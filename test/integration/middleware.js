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

  describe('postCreate', function () {
    var app = createFn()
    var server
    var options = {
      postCreate: sinon.spy(function (req, res, next) {
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

        server = app.listen(testPort, done)
      })
    })

    afterEach(function (done) {
      options.postCreate.reset()
      dismantle(app, server, done)
    })

    it('POST /Customers 201', function (done) {
      request.post({
        url: util.format('%s/api/v1/Customers', testUrl),
        json: {
          name: 'Bob'
        }
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 201)
        sinon.assert.calledOnce(options.postCreate)
        var args = options.postCreate.args[0]
        assert.equal(args.length, 3)
        assert.equal(args[0].erm.result.name, 'Bob')
        assert.equal(args[0].erm.statusCode, 201)
        assert.equal(typeof args[2], 'function')
        done()
      })
    })
  })

  describe('postRead', function () {
    var app = createFn()
    var server
    var customer
    var options = {
      postRead: sinon.spy(function (req, res, next) {
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
      options.postRead.reset()
      dismantle(app, server, done)
    })

    it('GET /Customers 200', function (done) {
      request.get({
        url: util.format('%s/api/v1/Customers', testUrl),
        json: true
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        sinon.assert.calledOnce(options.postRead)
        var args = options.postRead.args[0]
        assert.equal(args.length, 3)
        assert.equal(args[0].erm.result[0].name, 'Bob')
        assert.equal(args[0].erm.statusCode, 200)
        assert.equal(typeof args[2], 'function')
        done()
      })
    })

    it('GET /Customers/count 200', function (done) {
      request.get({
        url: util.format('%s/api/v1/Customers/count', testUrl),
        json: true
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        sinon.assert.calledOnce(options.postRead)
        var args = options.postRead.args[0]
        assert.equal(args.length, 3)
        assert.equal(args[0].erm.result.count, 1)
        assert.equal(args[0].erm.statusCode, 200)
        assert.equal(typeof args[2], 'function')
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
        sinon.assert.calledOnce(options.postRead)
        var args = options.postRead.args[0]
        assert.equal(args.length, 3)
        assert.equal(args[0].erm.result.name, 'Bob')
        assert.equal(args[0].erm.statusCode, 200)
        assert.equal(typeof args[2], 'function')
        done()
      })
    })

    it('GET /Customers/:id/shallow 200', function (done) {
      request.get({
        url: util.format('%s/api/v1/Customers/%s/shallow', testUrl, customer._id),
        json: true
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        sinon.assert.calledOnce(options.postRead)
        var args = options.postRead.args[0]
        assert.equal(args.length, 3)
        assert.equal(args[0].erm.result.name, 'Bob')
        assert.equal(args[0].erm.statusCode, 200)
        assert.equal(typeof args[2], 'function')
        done()
      })
    })
  })

  describe('postUpdate', function () {
    var app = createFn()
    var server
    var customer
    var options = {
      postUpdate: sinon.spy(function (req, res, next) {
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
      options.postUpdate.reset()
      dismantle(app, server, done)
    })

    it('POST /Customers/:id 200', function (done) {
      request.post({
        url: util.format('%s/api/v1/Customers/%s', testUrl, customer._id),
        json: {
          name: 'Bobby'
        }
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        sinon.assert.calledOnce(options.postUpdate)
        var args = options.postUpdate.args[0]
        assert.equal(args.length, 3)
        assert.equal(args[0].erm.result.name, 'Bobby')
        assert.equal(args[0].erm.statusCode, 200)
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
        sinon.assert.notCalled(options.postUpdate)
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
        sinon.assert.notCalled(options.postUpdate)
        done()
      })
    })

    it('PUT /Customers/:id 200', function (done) {
      request.put({
        url: util.format('%s/api/v1/Customers/%s', testUrl, customer._id),
        json: {
          name: 'Bobby'
        }
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        sinon.assert.calledOnce(options.postUpdate)
        var args = options.postUpdate.args[0]
        assert.equal(args.length, 3)
        assert.equal(args[0].erm.result.name, 'Bobby')
        assert.equal(args[0].erm.statusCode, 200)
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
        sinon.assert.notCalled(options.postUpdate)
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
        sinon.assert.notCalled(options.postUpdate)
        done()
      })
    })
  })

  describe('postDelete', function () {
    var app = createFn()
    var server
    var customer
    var options = {
      postDelete: sinon.spy(function (req, res, next) {
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
      options.postDelete.reset()
      dismantle(app, server, done)
    })

    it('DELETE /Customers 204', function (done) {
      request.del({
        url: util.format('%s/api/v1/Customers', testUrl),
        json: true
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 204)
        sinon.assert.calledOnce(options.postDelete)
        var args = options.postDelete.args[0]
        assert.equal(args.length, 3)
        assert.equal(args[0].erm.result, undefined)
        assert.equal(args[0].erm.statusCode, 204)
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
        sinon.assert.calledOnce(options.postDelete)
        var args = options.postDelete.args[0]
        assert.equal(args.length, 3)
        assert.equal(args[0].erm.result, undefined)
        assert.equal(args[0].erm.statusCode, 204)
        assert.equal(typeof args[2], 'function')
        done()
      })
    })
  })

  describe('postCreate yields an error', function () {
    var app = createFn()
    var server
    var options = {
      postCreate: sinon.spy(function (req, res, next) {
        var err = new Error('Something went wrong')
        err.statusCode = 400
        next(err)
      }),
      postProcess: sinon.spy(),
      restify: app.isRestify
    }

    beforeEach(function (done) {
      setup(function (err) {
        if (err) {
          return done(err)
        }

        erm.serve(app, db.models.Customer, options)

        server = app.listen(testPort, done)
      })
    })

    afterEach(function (done) {
      options.postCreate.reset()
      dismantle(app, server, done)
    })

    it('POST /Customers 201', function (done) {
      request.post({
        url: util.format('%s/api/v1/Customers', testUrl),
        json: {
          name: 'Bob'
        }
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 400)
        sinon.assert.calledOnce(options.postCreate)
        var args = options.postCreate.args[0]
        assert.equal(args.length, 3)
        assert.equal(args[0].erm.result.name, 'Bob')
        assert.equal(args[0].erm.statusCode, 201)
        assert.equal(typeof args[2], 'function')
        sinon.assert.notCalled(options.postProcess)
        done()
      })
    })
  })

  describe('postProcess', function () {
    var app = createFn()
    var server
    var options = {
      postProcess: sinon.spy(function (req, res, next) {
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

        server = app.listen(testPort, done)
      })
    })

    afterEach(function (done) {
      options.postProcess.reset()
      dismantle(app, server, done)
    })

    it('GET /Customers 200', function (done) {
      request.get({
        url: util.format('%s/api/v1/Customers', testUrl),
        json: true
      }, function (err, res, body) {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        sinon.assert.calledOnce(options.postProcess)
        var args = options.postProcess.args[0]
        assert.equal(args.length, 3)
        assert.deepEqual(args[0].erm.result, [])
        assert.equal(args[0].erm.statusCode, 200)
        assert.equal(typeof args[2], 'function')
        done()
      })
    })
  })
}
