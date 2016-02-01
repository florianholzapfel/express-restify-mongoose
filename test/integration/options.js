const assert = require('assert')
const request = require('request')
const util = require('util')
const sinon = require('sinon')

module.exports = function (createFn, setup, dismantle) {
  const erm = require('../../lib/express-restify-mongoose')
  const db = require('./setup')()

  const testPort = 30023
  const testUrl = `http://localhost:${testPort}`

  describe('no options', () => {
    let app = createFn()
    let server

    before(done => {
      setup(err => {
        if (err) {
          return done(err)
        }

        erm.serve(app, db.models.Customer, app.isRestify ? {
          restify: app.isRestify
        } : undefined)

        server = app.listen(testPort, done)
      })
    })

    after(done => {
      dismantle(app, server, done)
    })

    it('GET /Customers 200', done => {
      request.get({
        url: `${testUrl}/api/v1/Customers`
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        done()
      })
    })
  })

  describe('defaults - plural, lowercase and version set in defaults', () => {
    let app = createFn()
    let server

    before(done => {
      setup(err => {
        if (err) {
          return done(err)
        }

        erm.defaults({
          lowercase: true,
          plural: false,
          version: '/custom'
        })

        erm.serve(app, db.models.Customer, {
          restify: app.isRestify
        })

        erm.serve(app, db.models.Invoice, {
          restify: app.isRestify
        })

        server = app.listen(testPort, done)
      })
    })

    after(done => {
      erm.defaults({
        lowercase: false,
        plural: true
      })

      dismantle(app, server, done)
    })

    it('GET /customer 200', done => {
      request.get({
        url: util.format('%s/api/custom/customer', testUrl)
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        done()
      })
    })

    it('GET /invoice 200', done => {
      request.get({
        url: util.format('%s/api/custom/invoice', testUrl)
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        done()
      })
    })
  })

  describe('totalCountHeader - boolean (default header)', () => {
    let app = createFn()
    let server

    before(done => {
      setup(err => {
        if (err) {
          return done(err)
        }

        erm.serve(app, db.models.Customer, {
          totalCountHeader: true,
          restify: app.isRestify
        })

        db.models.Customer.create([{
          name: 'Bob'
        }, {
          name: 'John'
        }, {
          name: 'Mike'
        }]).then(createdCustomers => {
          server = app.listen(testPort, done)
        }, err => {
          done(err)
        })
      })
    })

    after(done => {
      dismantle(app, server, done)
    })

    it('GET /Customers?limit=1 200', done => {
      request.get({
        url: `${testUrl}/api/v1/Customers`,
        qs: {
          limit: 1
        },
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        assert.equal(res.headers['x-total-count'], 3)
        assert.equal(body.length, 1)
        done()
      })
    })

    it('GET /Customers?skip=1 200', done => {
      request.get({
        url: `${testUrl}/api/v1/Customers`,
        qs: {
          skip: 1
        },
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        assert.equal(res.headers['x-total-count'], 3)
        assert.equal(body.length, 2)
        done()
      })
    })

    it('GET /Customers?limit=1&skip=1 200', done => {
      request.get({
        url: `${testUrl}/api/v1/Customers`,
        qs: {
          limit: 1,
          skip: 1
        },
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        assert.equal(res.headers['x-total-count'], 3)
        assert.equal(body.length, 1)
        done()
      })
    })
  })

  describe('totalCountHeader - string (custom header)', () => {
    let app = createFn()
    let server

    before(done => {
      setup(err => {
        if (err) {
          return done(err)
        }

        erm.serve(app, db.models.Customer, {
          totalCountHeader: 'X-Custom-Count',
          restify: app.isRestify
        })

        db.models.Customer.create([{
          name: 'Bob'
        }, {
          name: 'John'
        }, {
          name: 'Mike'
        }]).then(createdCustomers => {
          server = app.listen(testPort, done)
        }, err => {
          done(err)
        })
      })
    })

    after(done => {
      dismantle(app, server, done)
    })

    it('GET /Customers?limit=1 200', done => {
      request.get({
        url: `${testUrl}/api/v1/Customers`,
        qs: {
          limit: 1
        },
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        assert.equal(res.headers['x-custom-count'], 3)
        assert.equal(body.length, 1)
        done()
      })
    })
  })

  describe('limit', () => {
    let app = createFn()
    let server

    before(done => {
      setup(err => {
        if (err) {
          return done(err)
        }

        erm.serve(app, db.models.Customer, {
          limit: 2,
          restify: app.isRestify
        })

        db.models.Customer.create([{
          name: 'Bob'
        }, {
          name: 'John'
        }, {
          name: 'Mike'
        }]).then(createdCustomers => {
          server = app.listen(testPort, done)
        }, err => {
          done(err)
        })
      })
    })

    after(done => {
      dismantle(app, server, done)
    })

    it('GET /Customers 200', done => {
      request.get({
        url: `${testUrl}/api/v1/Customers`,
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        assert.equal(body.length, 2)
        done()
      })
    })

    it('GET /Customers 200 - override limit in options (query.limit === 0)', done => {
      request.get({
        url: `${testUrl}/api/v1/Customers`,
        qs: {
          limit: 0
        },
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        assert.equal(body.length, 2)
        done()
      })
    })

    it('GET /Customers 200 - override limit in options (query.limit < options.limit)', done => {
      request.get({
        url: `${testUrl}/api/v1/Customers`,
        qs: {
          limit: 1
        },
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        assert.equal(body.length, 1)
        done()
      })
    })

    it('GET /Customers 200 - override limit in query (options.limit < query.limit)', done => {
      request.get({
        url: `${testUrl}/api/v1/Customers`,
        qs: {
          limit: 3
        },
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        assert.equal(body.length, 2)
        done()
      })
    })

    it('GET /Customers/count 200 - ignore limit', done => {
      request.get({
        url: `${testUrl}/api/v1/Customers/count`,
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        assert.equal(body.count, 3)
        done()
      })
    })
  })

  describe('lowercase', () => {
    let app = createFn()
    let server

    before(done => {
      setup(err => {
        if (err) {
          return done(err)
        }

        erm.serve(app, db.models.Customer, {
          lowercase: true,
          restify: app.isRestify
        })

        server = app.listen(testPort, done)
      })
    })

    after(done => {
      dismantle(app, server, done)
    })

    it('GET /customers 200', done => {
      request.get({
        url: `${testUrl}/api/v1/customers`
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        done()
      })
    })

    it('GET /Customers 200 (Express), 404 (Restify)', done => {
      request.get({
        url: `${testUrl}/api/v1/Customers`
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, app.isRestify ? 404 : 200)
        done()
      })
    })
  })

  describe('name', () => {
    let app = createFn()
    let server

    before(done => {
      setup(err => {
        if (err) {
          return done(err)
        }

        erm.serve(app, db.models.Customer, {
          name: 'Client',
          restify: app.isRestify
        })

        server = app.listen(testPort, done)
      })
    })

    after(done => {
      dismantle(app, server, done)
    })

    it('GET /Clients 200', done => {
      request.get({
        url: util.format('%s/api/v1/Clients', testUrl)
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        done()
      })
    })
  })

  describe('plural', () => {
    describe('true', () => {
      let app = createFn()
      let server

      before(done => {
        setup(err => {
          if (err) {
            return done(err)
          }

          erm.serve(app, db.models.Customer, {
            plural: true,
            restify: app.isRestify
          })

          server = app.listen(testPort, done)
        })
      })

      after(done => {
        dismantle(app, server, done)
      })

      it('GET /Customer 404', done => {
        request.get({
          url: util.format('%s/api/v1/Customer', testUrl)
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 404)
          done()
        })
      })

      it('GET /Customers 200', done => {
        request.get({
          url: `${testUrl}/api/v1/Customers`
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          done()
        })
      })
    })

    describe('false', () => {
      let app = createFn()
      let server

      before(done => {
        setup(err => {
          if (err) {
            return done(err)
          }

          erm.serve(app, db.models.Customer, {
            plural: false,
            restify: app.isRestify
          })

          server = app.listen(testPort, done)
        })
      })

      after(done => {
        dismantle(app, server, done)
      })

      it('GET /Customer 200', done => {
        request.get({
          url: util.format('%s/api/v1/Customer', testUrl)
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          done()
        })
      })

      it('GET /Customers 404', done => {
        request.get({
          url: `${testUrl}/api/v1/Customers`
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 404)
          done()
        })
      })
    })
  })

  describe('prefix', () => {
    let app = createFn()
    let server

    before(done => {
      setup(err => {
        if (err) {
          return done(err)
        }

        erm.serve(app, db.models.Customer, {
          prefix: '/applepie',
          restify: app.isRestify
        })

        server = app.listen(testPort, done)
      })
    })

    after(done => {
      dismantle(app, server, done)
    })

    it('GET /applepie/v1/Customers 200', done => {
      request.get({
        url: util.format('%s/applepie/v1/Customers', testUrl)
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        done()
      })
    })
  })

  describe('version', () => {
    describe('v8', () => {
      let app = createFn()
      let server

      before(done => {
        setup(err => {
          if (err) {
            return done(err)
          }

          erm.serve(app, db.models.Customer, {
            version: '/v8',
            restify: app.isRestify
          })

          server = app.listen(testPort, done)
        })
      })

      after(done => {
        dismantle(app, server, done)
      })

      it('GET /v8/Customers 200', done => {
        request.get({
          url: util.format('%s/api/v8/Customers', testUrl)
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          done()
        })
      })
    })

    describe('custom id location', () => {
      let app = createFn()
      let server
      let customer

      before(done => {
        setup(err => {
          if (err) {
            return done(err)
          }

          erm.serve(app, db.models.Customer, {
            version: '/v8/Entities/:id',
            restify: app.isRestify
          })

          db.models.Customer.create({
            name: 'Bob'
          }).then(createdCustomer => {
            customer = createdCustomer
            server = app.listen(testPort, done)
          }, err => {
            done(err)
          })
        })
      })

      after(done => {
        dismantle(app, server, done)
      })

      it('GET /v8/Entities/Customers 200', done => {
        request.get({
          url: util.format('%s/api/v8/Entities/Customers', testUrl)
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          done()
        })
      })

      it('GET /v8/Entities/:id/Customers 200', done => {
        request.get({
          url: util.format('%s/api/v8/Entities/%s/Customers', testUrl, customer._id)
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          done()
        })
      })

      it('GET /v8/Entities/:id/Customers/shallow 200', done => {
        request.get({
          url: util.format('%s/api/v8/Entities/%s/Customers/shallow', testUrl, customer._id)
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          done()
        })
      })

      it('GET /v8/Entities/Customers/count 200', done => {
        request.get({
          url: util.format('%s/api/v8/Entities/Customers/count', testUrl)
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          done()
        })
      })
    })
  })

  describe('defaults - preUpdate with falsy findOneAndUpdate', () => {
    let app = createFn()
    let server
    let customer
    let options = {
      findOneAndUpdate: false,
      preUpdate: [
        sinon.spy((req, res, next) => {
          next()
        }),
        sinon.spy((req, res, next) => {
          next()
        })
      ]
    }

    before(done => {
      setup(err => {
        if (err) {
          return done(err)
        }

        erm.defaults(options)

        erm.serve(app, db.models.Product, {
          restify: app.isRestify
        })

        // order is important, test the second attached model to potentially reproduce the error.
        erm.serve(app, db.models.Customer, {
          restify: app.isRestify
        })

        db.models.Customer.create({
          name: 'Bob'
        }).then(createdCustomer => {
          customer = createdCustomer
          server = app.listen(testPort, done)
        }, err => {
          done(err)
        })
      })
    })

    after(done => {
      erm.defaults(null)
      dismantle(app, server, done)
    })

    it('PUT /Customers/:id 200', done => {
      request.put({
        url: `${testUrl}/api/v1/Customers/${customer._id}`,
        json: {
          age: 12
        }
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        assert.equal(body.name, 'Bob')
        assert.equal(body.age, 12)
        assert.equal(options.preUpdate.length, 2)
        sinon.assert.calledOnce(options.preUpdate[0])
        sinon.assert.calledOnce(options.preUpdate[1])
        done()
      })
    })
  })

  describe('defaults - preDelete with falsy findOneAndRemove', () => {
    let app = createFn()
    let server
    let customer
    let options = {
      findOneAndRemove: false,
      preDelete: [
        sinon.spy((req, res, next) => {
          next()
        }),
        sinon.spy((req, res, next) => {
          next()
        })
      ]
    }

    before(done => {
      setup(err => {
        if (err) {
          return done(err)
        }

        erm.defaults(options)

        erm.serve(app, db.models.Product, {
          restify: app.isRestify
        })

        // order is important, test the second attached model to potentially reproduce the error.
        erm.serve(app, db.models.Customer, {
          restify: app.isRestify
        })

        db.models.Customer.create({
          name: 'Bob'
        }).then(createdCustomer => {
          customer = createdCustomer
          server = app.listen(testPort, done)
        }, err => {
          done(err)
        })
      })
    })

    after(done => {
      erm.defaults(null)
      dismantle(app, server, done)
    })

    it('DELETE /Customers/:id 204', done => {
      request.del({
        url: `${testUrl}/api/v1/Customers/${customer._id}`
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 204)
        assert.equal(options.preDelete.length, 2)
        sinon.assert.calledOnce(options.preDelete[0])
        sinon.assert.calledOnce(options.preDelete[1])
        done()
      })
    })
  })

  describe('idProperty', () => {
    let app = createFn()
    let server
    let customer

    before(done => {
      setup(err => {
        if (err) {
          return done(err)
        }

        erm.serve(app, db.models.Customer, {
          idProperty: 'name',
          restify: app.isRestify
        })

        db.models.Customer.create({
          name: 'Bob'
        }).then(createdCustomer => {
          customer = createdCustomer
          server = app.listen(testPort, done)
        }, err => {
          done(err)
        })
      })
    })

    after(done => {
      dismantle(app, server, done)
    })

    it('GET /Customers/:name 200', done => {
      request.get({
        url: `${testUrl}/api/v1/Customers/${customer.name}`,
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        assert.equal(body.name, 'Bob')
        done()
      })
    })

    it('POST /Customers/:name 200', done => {
      request.post({
        url: `${testUrl}/api/v1/Customers/${customer.name}`,
        json: {
          age: 12
        }
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        assert.equal(body.name, 'Bob')
        assert.equal(body.age, 12)
        done()
      })
    })

    it('PUT /Customers/:name 200', done => {
      request.put({
        url: `${testUrl}/api/v1/Customers/${customer.name}`,
        json: {
          age: 12
        }
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        assert.equal(body.name, 'Bob')
        assert.equal(body.age, 12)
        done()
      })
    })

    it('DELETE /Customers/:name 204', done => {
      request.del({
        url: `${testUrl}/api/v1/Customers/${customer.name}`
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 204)
        done()
      })
    })
  })
}
