const assert = require('assert')
const request = require('request')
const sinon = require('sinon')

module.exports = function (createFn, setup, dismantle) {
  const erm = require('../../lib/express-restify-mongoose')
  const db = require('./setup')()

  const testPort = 30023
  const testUrl = `http://localhost:${testPort}`
  const updateMethods = ['PATCH', 'POST', 'PUT']

  describe('no options', () => {
    let app = createFn()
    let server

    before((done) => {
      setup((err) => {
        if (err) {
          return done(err)
        }

        erm.serve(app, db.models.Customer, app.isRestify ? {
          restify: app.isRestify
        } : undefined)

        server = app.listen(testPort, done)
      })
    })

    after((done) => {
      dismantle(app, server, done)
    })

    it('GET /Customer 200', (done) => {
      request.get({
        url: `${testUrl}/api/v1/Customer`
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        done()
      })
    })
  })

  describe('defaults - version set in defaults', () => {
    let app = createFn()
    let server

    before((done) => {
      setup((err) => {
        if (err) {
          return done(err)
        }

        erm.defaults({
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

    after((done) => {
      erm.defaults({
        version: '/v1'
      })

      dismantle(app, server, done)
    })

    it('GET /Customer 200', (done) => {
      request.get({
        url: `${testUrl}/api/custom/Customer`
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        done()
      })
    })

    it('GET /Invoice 200', (done) => {
      request.get({
        url: `${testUrl}/api/custom/Invoice`
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

    before((done) => {
      setup((err) => {
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
        }]).then((createdCustomers) => {
          server = app.listen(testPort, done)
        }, (err) => {
          done(err)
        })
      })
    })

    after((done) => {
      dismantle(app, server, done)
    })

    it('GET /Customer?limit=1 200', (done) => {
      request.get({
        url: `${testUrl}/api/v1/Customer`,
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

    it('GET /Customer?skip=1 200', (done) => {
      request.get({
        url: `${testUrl}/api/v1/Customer`,
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

    it('GET /Customer?limit=1&skip=1 200', (done) => {
      request.get({
        url: `${testUrl}/api/v1/Customer`,
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

    before((done) => {
      setup((err) => {
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
        }]).then((createdCustomers) => {
          server = app.listen(testPort, done)
        }, (err) => {
          done(err)
        })
      })
    })

    after((done) => {
      dismantle(app, server, done)
    })

    it('GET /Customer?limit=1 200', (done) => {
      request.get({
        url: `${testUrl}/api/v1/Customer`,
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

    before((done) => {
      setup((err) => {
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
        }]).then((createdCustomers) => {
          server = app.listen(testPort, done)
        }, (err) => {
          done(err)
        })
      })
    })

    after((done) => {
      dismantle(app, server, done)
    })

    it('GET /Customer 200', (done) => {
      request.get({
        url: `${testUrl}/api/v1/Customer`,
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        assert.equal(body.length, 2)
        done()
      })
    })

    it('GET /Customer 200 - override limit in options (query.limit === 0)', (done) => {
      request.get({
        url: `${testUrl}/api/v1/Customer`,
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

    it('GET /Customer 200 - override limit in options (query.limit < options.limit)', (done) => {
      request.get({
        url: `${testUrl}/api/v1/Customer`,
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

    it('GET /Customer 200 - override limit in query (options.limit < query.limit)', (done) => {
      request.get({
        url: `${testUrl}/api/v1/Customer`,
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

    it('GET /Customer/count 200 - ignore limit', (done) => {
      request.get({
        url: `${testUrl}/api/v1/Customer/count`,
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        assert.equal(body.count, 3)
        done()
      })
    })
  })

  describe('name', () => {
    let app = createFn()
    let server

    before((done) => {
      setup((err) => {
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

    after((done) => {
      dismantle(app, server, done)
    })

    it('GET /Client 200', (done) => {
      request.get({
        url: `${testUrl}/api/v1/Client`
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        done()
      })
    })
  })

  describe('prefix', () => {
    let app = createFn()
    let server

    before((done) => {
      setup((err) => {
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

    after((done) => {
      dismantle(app, server, done)
    })

    it('GET /applepie/v1/Customer 200', (done) => {
      request.get({
        url: `${testUrl}/applepie/v1/Customer`
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

      before((done) => {
        setup((err) => {
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

      after((done) => {
        dismantle(app, server, done)
      })

      it('GET /v8/Customer 200', (done) => {
        request.get({
          url: `${testUrl}/api/v8/Customer`
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

      before((done) => {
        setup((err) => {
          if (err) {
            return done(err)
          }

          erm.serve(app, db.models.Customer, {
            version: '/v8/Entities/:id',
            restify: app.isRestify
          })

          db.models.Customer.create({
            name: 'Bob'
          }).then((createdCustomer) => {
            customer = createdCustomer
            server = app.listen(testPort, done)
          }, (err) => {
            done(err)
          })
        })
      })

      after((done) => {
        dismantle(app, server, done)
      })

      it('GET /v8/Entities/Customer 200', (done) => {
        request.get({
          url: `${testUrl}/api/v8/Entities/Customer`
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          done()
        })
      })

      it('GET /v8/Entities/:id/Customer 200', (done) => {
        request.get({
          url: `${testUrl}/api/v8/Entities/${customer._id}/Customer`
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          done()
        })
      })

      it('GET /v8/Entities/:id/Customer/shallow 200', (done) => {
        request.get({
          url: `${testUrl}/api/v8/Entities/${customer._id}/Customer/shallow`
        }, (err, res, body) => {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          done()
        })
      })

      it('GET /v8/Entities/Customer/count 200', (done) => {
        request.get({
          url: `${testUrl}/api/v8/Entities/Customer/count`
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

    before((done) => {
      setup((err) => {
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
        }).then((createdCustomer) => {
          customer = createdCustomer
          server = app.listen(testPort, done)
        }, (err) => {
          done(err)
        })
      })
    })

    after((done) => {
      erm.defaults(null)
      dismantle(app, server, done)
    })

    updateMethods.forEach((method) => {
      it(`${method} /Customer/:id 200`, (done) => {
        request({ method,
          url: `${testUrl}/api/v1/Customer/${customer._id}`,
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

          options.preUpdate[0].reset()
          options.preUpdate[1].reset()

          done()
        })
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

    before((done) => {
      setup((err) => {
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
        }).then((createdCustomer) => {
          customer = createdCustomer
          server = app.listen(testPort, done)
        }, (err) => {
          done(err)
        })
      })
    })

    after((done) => {
      erm.defaults(null)
      dismantle(app, server, done)
    })

    it('DELETE /Customer/:id 204', (done) => {
      request.del({
        url: `${testUrl}/api/v1/Customer/${customer._id}`
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

    before((done) => {
      setup((err) => {
        if (err) {
          return done(err)
        }

        erm.serve(app, db.models.Customer, {
          idProperty: 'name',
          restify: app.isRestify
        })

        db.models.Customer.create({
          name: 'Bob'
        }).then((createdCustomer) => {
          customer = createdCustomer
          server = app.listen(testPort, done)
        }, (err) => {
          done(err)
        })
      })
    })

    after((done) => {
      dismantle(app, server, done)
    })

    it('GET /Customer/:name 200', (done) => {
      request.get({
        url: `${testUrl}/api/v1/Customer/${customer.name}`,
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 200)
        assert.equal(body.name, 'Bob')
        done()
      })
    })

    updateMethods.forEach((method) => {
      it(`${method} /Customer/:name 200`, (done) => {
        request({ method,
          url: `${testUrl}/api/v1/Customer/${customer.name}`,
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
    })

    it('DELETE /Customer/:name 204', (done) => {
      request.del({
        url: `${testUrl}/api/v1/Customer/${customer.name}`
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 204)
        done()
      })
    })
  })

  describe('allowRegex', () => {
    let app = createFn()
    let server

    before((done) => {
      setup((err) => {
        if (err) {
          return done(err)
        }

        erm.serve(app, db.models.Customer, {
          allowRegex: false,
          restify: app.isRestify
        })

        db.models.Customer.create({
          name: 'Bob'
        }).then((createdCustomer) => {
          server = app.listen(testPort, done)
        }, (err) => {
          done(err)
        })
      })
    })

    after((done) => {
      dismantle(app, server, done)
    })

    it('GET /Customer 200', (done) => {
      request.get({
        url: `${testUrl}/api/v1/Customer`,
        qs: {
          query: JSON.stringify({
            name: { $regex: '^B' }
          })
        },
        json: true
      }, (err, res, body) => {
        assert.ok(!err)
        assert.equal(res.statusCode, 400)
        done()
      })
    })
  })
}
