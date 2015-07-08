/* global describe, before, after, beforeEach, afterEach, it */
'use strict'

var erm = require('../lib/express-restify-mongoose')

var setup = require('./setup')

var assert = require('assertmessage')
var async = require('async')
var request = require('request')
var sinon = require('sinon')
var util = require('util')

var testPort = 30023
var testUrl = 'http://localhost:' + testPort

module.exports = function (createFn) {
  describe(createFn.name, function () {
    describe('General', function () {
      var savedProduct
      var savedCustomer
      var savedInvoice
      var server
      var app = createFn()

      setup()

      before(function (done) {
        erm.defaults({
          restify: app.isRestify,
          outputFn: app.outputFn,
          lean: false,
          middleware: []
        })
        erm.serve(app, setup.CustomerModel)
        erm.serve(app, setup.ProductModel)
        erm.serve(app, setup.InvoiceModel)

        server = app.listen(testPort, done)
      })

      after(function (done) {
        if (app.close) {
          return app.close(done)
        }
        server.close(done)
      })

      it('200 POST Products', function (done) {
        request.post({
          url: util.format('%s/api/v1/Products', testUrl),
          json: {
            name: 'ACME Product',
            department: {
              name: 'Sales',
              code: 1
            },
            price: 10
          }
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 201, 'Wrong status code')
          assert.ok(body._id, '_id is not set')
          assert.equal(body.name, 'ACME Product')
          assert.equal(body.price, 10)
          savedProduct = body
          done()
        })
      })

      it('200 POST 2 Products', function (done) {
        request.post({
          url: util.format('%s/api/v1/Products', testUrl),
          json: [
            {
              name: 'ACME Product',
              department: {
                name: 'Sales',
                code: 1
              },
              price: 10
            },
            {
              name: 'Another ACME Product',
              department: {
                name: 'Sales',
                code: 1
              },
              price: 20
            }
          ]
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 201, 'Wrong status code')
          assert.ok(Array.isArray(body))
          assert.ok(body.length, 2)
          done()
        })
      })

      it('200 POST Products/:id', function (done) {
        request.post({
          url: util.format('%s/api/v1/Products/%s', testUrl,
            savedProduct._id),
          json: {
            name: 'Product',
            department: {
              name: 'Sales',
              code: 1
            },
            price: 11
          }
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200, 'Wrong status code')
          assert.ok(body._id, '_id is not set')
          assert.equal(body.name, 'Product')
          assert.equal(body.price, 11)
          savedProduct = body
          done()
        })
      })

      it('200 GET Products/:id', function (done) {
        request.get({
          url: util.format('%s/api/v1/Products/%s', testUrl,
            savedProduct._id),
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200, 'Wrong status code')
          assert.deepEqual(body, savedProduct)
          done()
        })
      })

      it('200 GET Products/:id/shallow', function (done) {
        request.get({
          url: util.format('%s/api/v1/Products/%s/shallow',
            testUrl, savedProduct._id),
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200, 'Wrong status code')
          var obj = {}
          for (var prop in savedProduct) {
            obj[prop] = typeof savedProduct[prop] === 'object' && prop !== '_id' ?
              true : savedProduct[prop]
          }
          assert.deepEqual(body, obj)
          done()
        })
      })

      it('200 GET Customers should return no objects', function (done) {
        request.get({
          url: util.format('%s/api/v1/Customers', testUrl),
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200, 'Wrong status code')
          assert.equal(body.length, 0, 'Answer is not empty')
          done()
        })
      })

      it('200 GET Customers/count should return 0', function (done) {
        request.get({
          url: util.format('%s/api/v1/Customers/count', testUrl),
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200, 'Wrong status code')
          assert.equal(body.count, 0, 'Wrong count')
          done()
        })
      })

      it('200 POST Customers', function (done) {
        request.post({
          url: util.format('%s/api/v1/Customers', testUrl),
          json: {
            name: 'Test',
            comment: 'Comment',
            _id: null
          }
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 201, 'Wrong status code')
          assert.ok(body._id, '_id is not set')
          assert.equal(body.name, 'Test')
          assert.equal(body.comment, 'Comment')
          assert.equal(body.info, 'Test is awesome')
          savedCustomer = body
          done()
        })
      })

      it('200 POST 2 Customers', function (done) {
        request.post({
          url: util.format('%s/api/v1/Customers', testUrl),
          json: [
            {
              name: 'First Customer',
              comment: 'Comment'
            },
            {
              name: 'Second Customer',
              comment: 'Comment 2'
            }
          ]
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 201, 'Wrong status code')
          assert.ok(Array.isArray(body))
          assert.equal(body.length, 2)
          done()
        })
      })

      it('200 GET Customers should return 3 objects',
        function (done) {
          request.get({
            url: util.format('%s/api/v1/Customers', testUrl),
            json: true
          }, function (err, res, body) {
            assert.ok(!err)
            assert.equal(res.statusCode, 200, 'Wrong status code')
            assert.equal(body.length, 3, 'Wrong count')
            done()
          })
        })

      it('200 GET Customers/count should return 3', function (done) {
        request.get({
          url: util.format('%s/api/v1/Customers/count', testUrl),
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200, 'Wrong status code')
          assert.equal(body.count, 3, 'Wrong count')
          done()
        })
      })

      it.skip('200 GET Customers/virtual query should return one object', function (done) {
        request.get({
          url: util.format('%s/api/v1/Customers', testUrl),
          qs: {
            info: 'Test is awesome'
          },
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200, 'Wrong status code')
          assert.ok(Array.isArray(body))
          assert.equal(body.length, 1)
          assert.equal(savedCustomer._id, body[0]._id, 'Wrong object returned')
          done()
        })
      })

      it('200 POST Invoice using pre-defined version', function (done) {
        request.post({
          url: util.format('%s/api/v1/Invoices', testUrl),
          json: {
            customer: savedCustomer._id,
            products: savedProduct._id,
            amount: 8.5,
            __version: 1
          }
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 201, 'Wrong status code')
          assert.ok(body._id, '_id is not set')
          assert.equal(body.customer, savedCustomer._id)
          assert.ok(Array.isArray(body.products))
          assert.equal(body.products.length, 1)
          assert.equal(body.products[0], savedProduct._id)
          assert.equal(body.amount, 8.5)
          savedInvoice = body
          done()
        })
      })

      it('200 POST Invoice referencing objects', function (done) {
        request.post({
          url: util.format('%s/api/v1/Invoices', testUrl),
          json: {
            customer: savedCustomer,
            products: savedProduct,
            amount: 8.5,
            __version: 1
          }
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 201, 'Wrong status code')
          assert.ok(body._id, '_id is not set')
          assert.equal(body.customer, savedCustomer._id)
          assert.ok(Array.isArray(body.products))
          assert.equal(body.products.length, 1)
          assert.equal(body.products[0], savedProduct._id)
          assert.equal(body.amount, 8.5)
          done()
        })
      })

      it('200 POST Invoice with 2 products referencing _id',
        function (done) {
          request.post({
            url: util.format('%s/api/v1/Invoices', testUrl),
            json: {
              customer: savedCustomer._id,
              products: [
                savedProduct._id,
                savedProduct._id
              ],
              amount: 8.5
            }
          }, function (err, res, body) {
            assert.ok(!err)
            assert.equal(res.statusCode, 201, 'Wrong status code')
            assert.ok(body._id, '_id is not set')
            assert.equal(body.customer, savedCustomer._id)
            assert.ok(Array.isArray(body.products))
            assert.equal(body.products.length, 2)
            assert.equal(body.products[0], savedProduct._id)
            assert.equal(body.products[1], savedProduct._id)
            assert.equal(body.amount, 8.5)
            done()
          })
        })

      it('200 POST Invoice with 2 products referencing objects',
        function (done) {
          request.post({
            url: util.format('%s/api/v1/Invoices', testUrl),
            json: {
              customer: savedCustomer._id,
              products: [
                savedProduct,
                savedProduct
              ],
              amount: 8.5
            }
          }, function (err, res, body) {
            assert.ok(!err)
            assert.equal(res.statusCode, 201, 'Wrong status code')
            assert.ok(body._id, '_id is not set')
            assert.equal(body.customer, savedCustomer._id)
            assert.ok(Array.isArray(body.products))
            assert.equal(body.products.length, 2)
            assert.equal(body.products[0], savedProduct._id)
            assert.equal(body.products[1], savedProduct._id)
            assert.equal(body.amount, 8.5)
            done()
          })
        })

      it('400 GET Customers/invalid field query', function (done) {
        request.get({
          url: util.format('%s/api/v1/Customers/?foo=bar', testUrl),
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 400, 'Wrong status code')
          done()
        })
      })

      it('200 GET Customers?limit=1 should return 1 object',
        function (done) {
          request.get({
            url: util.format('%s/api/v1/Customers', testUrl),
            qs: {
              limit: 1
            },
            json: true
          }, function (err, res, body) {
            assert.ok(!err)
            assert.equal(res.statusCode, 200, 'Wrong status code')
            assert.equal(body.length, 1, 'Wrong count')
            done()
          })
        })

      it('200 GET Customers?skip=2 should return 1 object',
        function (done) {
          request.get({
            url: util.format('%s/api/v1/Customers', testUrl),
            qs: {
              skip: 2
            },
            json: true
          }, function (err, res, body) {
            assert.ok(!err)
            assert.equal(res.statusCode, 200, 'Wrong status code')
            assert.equal(body.length, 1, 'Wrong count')
            done()
          })
        })

      it('200 GET Customers?name=Test', function (done) {
        request.get({
          url: util.format('%s/api/v1/Customers', testUrl),
          qs: {
            name: 'Test'
          },
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200, 'Wrong status code')
          assert.equal(body.length, 1,
            'Wrong count of customers returned')
          assert.deepEqual(savedCustomer, body[0])
          done()
        })
      })

      it('200 GET Customers?name!=Test', function (done) {
        request.get({
          url: util.format('%s/api/v1/Customers', testUrl),
          qs: {
            name: '!=Test'
          },
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200, 'Wrong status code')
          assert.equal(body.length, 2,
            'Wrong count of customers returned')
          done()
        })
      })

      it('200 GET Products?query', function (done) {
        var query = { $or: [
            {name: '~Another'},
            {$and: [
                {name: '~Product'},
                {price: '<=10'}
            ]}
          ],
          price: 20
        }
        request.get({
          url: util.format('%s/api/v1/Products?query=%s',
            testUrl,
            encodeURIComponent(JSON.stringify(query))),
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200,
            'Wrong status code')
          assert.equal(body.length, 1,
            'Wrong count of customers returned')
          done()
        })
      }
      )

      it('200 GET Products?$and[?]', function (done) {
        request.get({
          url: util.format('%s/api/v1/Products?$and=%s',
            testUrl,
            '[{"name":"~ACME"},{"price":"!=20"}]'),
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200, 'Wrong status code')
          assert.equal(body.length, 1,
            'Wrong count of customers returned')
          done()
        })
      })

      it('200 GET Products?$or[$and[?]]', function (done) {
        request.get({
          url: util.format('%s/api/v1/Products?$or=%s',
            testUrl,
            '[{"name":"~Another"},' +
            '{"$and":[{"name":"~Product"},' +
            '{"price":"<=10"}]}]'),
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200, 'Wrong status code')
          assert.equal(body.length, 2,
            'Wrong count of customers returned')
          done()
        })
      })

      it('200 GET Invoices?populate=customer should populate ' +
        'customer', function (done) {
          request.get({
            url: util.format('%s/api/v1/Invoices', testUrl),
            qs: {
              populate: 'customer'
            },
            json: true
          }, function (err, res, body) {
            assert.ok(!err)
            savedInvoice = body[0]
            savedInvoice.amount = 9.5
            assert.equal(res.statusCode, 200, 'Wrong status code')
            assert.deepEqual(body[0].customer, savedCustomer)
            done()
          })
        })

      it('200 POST Updated and populated Invoice', function (done) {
        request.post({
          url: util.format('%s/api/v1/Invoices/%s', testUrl,
            savedInvoice._id),
          json: savedInvoice
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200, 'Wrong status code')
          assert.equal(body.amount, 9.5)
          done()
        })
      })

      // here
      it('200 GET Customers/:id?select=name should not fetch ' +
        'comment or address fields', function (done) {
          request.get({
            url: util.format('%s/api/v1/Customers/%s?select=name',
              testUrl,
              savedCustomer._id),
            json: true
          }, function (err, res, body) {
            assert.ok(!err)
            assert.equal(res.statusCode, 200, 'Wrong status code')
            assert.equal('Test', body.name)
            assert.equal(undefined, body.comment,
              'Comment field should not be included')
            assert.equal(undefined, body.address,
              'Address field should not be included')
            done()
          })
        })
      it('200 GET Customers/:id?select=-name should not fetch name ' +
        '(but e.g. comment should be available)', function (done) {
          request.get({
            url: util.format('%s/api/v1/Customers/%s?select=-name',
              testUrl,
              savedCustomer._id),
            json: true
          }, function (err, res, body) {
            assert.ok(!err)
            assert.equal(res.statusCode, 200, 'Wrong status code')
            assert.equal(undefined, body.name,
              'Name field should not be included')
            assert.equal('Comment', body.comment,
              'Comment field should be included')
            done()
          })
        })

      it('200 GET Invoices/:id?populate=customer&select=' +
        'customer.name,amount should not fetch ' +
        'customer.comment field', function (done) {
          request.get({
            url: util.format('%s/api/v1/Invoices/%s?populate' +
            '=customer&select=amount,customer.name',
              testUrl,
              savedInvoice._id),
            json: true
          }, function (err, res, body) {
            assert.ok(!err)
            assert.equal(res.statusCode, 200, 'Wrong status code')
            assert.equal(9.5, body.amount)
            assert.equal(undefined, body.products)
            assert.equal(undefined, body.customer.comment)
            assert.equal('Test', body.customer.name)
            done()
          })
        })
      it('200 GET Invoices/:id?populate=customer&select=' +
        'customer.name should not suppress ' +
        'invoice fields', function (done) {
          request.get({
            url: util.format('%s/api/v1/Invoices/%s?populate' +
            '=customer&select=customer.name',
              testUrl,
              savedInvoice._id),
            json: true
          }, function (err, res, body) {
            assert.ok(!err)
            assert.equal(res.statusCode, 200, 'Wrong status code')
            assert.equal(9.5, body.amount)
            assert.equal(undefined, body.customer.comment)
            assert.equal('Test', body.customer.name)
            done()
          })
        })
      it('200 GET Invoices/:id?populate=customer&select=' +
        'customer.name,amount should not fetch ' +
        'invoice.products fields', function (done) {
          request.get({
            url: util.format('%s/api/v1/Invoices/%s?populate' +
            '=customer&select=customer.name,amount',
              testUrl,
              savedInvoice._id),
            json: true
          }, function (err, res, body) {
            assert.ok(!err)
            assert.equal(res.statusCode, 200, 'Wrong status code')
            assert.equal(9.5, body.amount)
            assert.equal(undefined, body.products)
            assert.equal(undefined, body.customer.comment)
            assert.equal('Test', body.customer.name)
            done()
          })
        })

      it('200 GET Customers/:id', function (done) {
        request.get({
          url: util.format('%s/api/v1/Customers/%s', testUrl,
            savedCustomer._id),
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200, 'Wrong status code')
          assert.deepEqual(savedCustomer, body)
          done()
        })
      })

      it('200 PUT Customers/:id', function (done) {
        savedCustomer.name = 'Test 2'
        savedCustomer.info = savedCustomer.name + ' is awesome'
        request.put({
          url: util.format('%s/api/v1/Customers/%s', testUrl,
            savedCustomer._id),
          json: savedCustomer
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200, 'Wrong status code')
          assert.deepEqual(savedCustomer, body)
          done()
        })
      })

      it('200 POST Customers/:id', function (done) {
        request.post({
          url: util.format('%s/api/v1/Customers/%s', testUrl,
            savedCustomer._id),
          json: savedCustomer
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200, 'Wrong status code')
          assert.deepEqual(savedCustomer, body)
          done()
        })
      })

      it('200 DEL Customers/:id', function (done) {
        request.del({
          url: util.format('%s/api/v1/Customers/%s', testUrl,
            savedCustomer._id),
          json: true
        }, function (err, res) {
          assert.ok(!err)
          assert.equal(res.statusCode, 204, 'Wrong status code')
          done()
        })
      })

      it('404 on deleted Customers/:id', function (done) {
        request.get({
          url: util.format('%s/api/v1/Customers/%s', testUrl,
            savedCustomer._id),
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 404, 'Wrong status code')
          done()
        })
      })
    })

    describe('Return virtuals', function () {
      var savedCustomer
      var server
      var app = createFn()

      setup()

      before(function (done) {
        erm.serve(app, setup.CustomerModel, {
          lean: false,
          outputFn: app.outputFn,
          restify: app.isRestify
        })
        server = app.listen(testPort, function () {
          request.post({
            url: util.format('%s/api/v1/Customers', testUrl),
            json: {
              name: 'Bob'
            }
          }, function (err, res, body) {
            assert.ok(!err)
            savedCustomer = body
            done()
          })
        })
      })

      after(function (done) {
        if (app.close) {
          return app.close(done)
        }
        server.close(done)
      })

      it('200 GET Customers', function (done) {
        var info = savedCustomer.name + ' is awesome'
        request.get({
          url: util.format('%s/api/v1/Customers', testUrl),
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200, 'Wrong status code')
          assert.equal(body[0].info, info, 'info is not defined')
          done()
        })
      })
    })

    describe('Excluded comment field', function () {
      var savedCustomer
      var savedInvoice
      var server
      var app = createFn()

      setup()

      before(function (done) {
        erm.defaults({
          restify: app.isRestify,
          outputFn: app.outputFn
        })

        erm.serve(app, setup.CustomerModel, {
          'private': 'comment',
          lean: false
        })
        erm.serve(app, setup.InvoiceModel)

        server = app.listen(testPort, function () {
          async.waterfall([function (next) {
            request.post({
              url: util.format('%s/api/v1/Customers', testUrl),
              json: {
                name: 'Test',
                comment: 'Comment'
              }
            }, function (err, res, body) {
              assert.ok(!err)
              next(null, body)
            })
          }, function (customer, next) {
            request.post({
              url: util.format('%s/api/v1/Invoices', testUrl),
              json: {
                customer: customer._id,
                amount: 42,
                __version: 1
              }
            }, function (err, res, body) {
              assert.ok(!err)
              next(null, customer, body)
            })
          }], function (err, customer, invoice) {
            assert.ok(!err)
            savedCustomer = customer
            savedInvoice = invoice
            done()
          })
        })
      })

      after(function (done) {
        if (app.close) {
          return app.close(done)
        }
        server.close(done)
      })

      it('200 GET Customers', function (done) {
        request.get({
          url: util.format('%s/api/v1/Customers', testUrl),
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200, 'Wrong status code')
          assert.ok(body[0], 'no items found')
          assert.ok(body[0].comment === undefined,
            'comment is not undefined')

          done()
        })
      })

      it('200 GET Customers/:id', function (done) {
        request.get({
          url: util.format('%s/api/v1/Customers/%s', testUrl,
            savedCustomer._id),
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200, 'Wrong status code')
          assert.ok(body, 'no item found')
          assert.deepEqual(savedCustomer, body)
          assert.ok(body.comment === undefined,
            'comment is not undefined')
          done()
        })
      })

      it('400 GET Customers?comment=Comment should return HTTP 400',
        function (done) {
          request.get({
            url: util.format('%s/api/v1/Customers', testUrl),
            qs: {
              comment: 'Comment'
            },
            json: true
          }, function (err, res, body) {
            assert.ok(!err)
            assert.equal(res.statusCode, 400, 'Wrong status code')
            done()
          })
        })
      it('excludes populated fields', function (done) {
        request.get({
          url: util.format('%s/api/v1/Invoices/%s', testUrl,
            savedInvoice._id),
          qs: { populate: 'customer' },
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          assert.ok(body.customer._id, 'customer not populated')
          assert.ok(body.customer.comment === undefined,
            'comment is not undefined')
          done()
        })
      })
    })

    describe('Lower case model name', function () {
      var server
      var app = createFn()

      // only restify's routes are case sensitive
      if (app.isRestify) {
        setup()

        before(function (done) {
          erm.serve(app, setup.CustomerModel, {
            lowercase: true,
            restify: app.isRestify,
            outputFn: app.outputFn
          })
          server = app.listen(testPort, done)
        })

        after(function (done) {
          if (app.close) {
            return app.close(done)
          }
          server.close(done)
        })

        it('200 GET customers', function (done) {
          request.get({
            url: util.format('%s/api/v1/customers', testUrl),
            json: true
          }, function (err, res, body) {
            assert.ok(!err)
            assert.equal(res.statusCode, 200, 'Wrong status code')
            done()
          })
        })

        it('404 GET Customers', function (done) {
          request.get({
            url: util.format('%s/api/v1/Customers', testUrl),
            json: true
          }, function (err, res, body) {
            assert.ok(!err)
            assert.equal(res.statusCode, 404, 'Wrong status code')
            done()
          })
        })
      }
    })

    describe('Return Validation Errors', function () {
      var server
      var app = createFn()

      setup()

      before(function (done) {
        erm.serve(app, setup.CustomerModel, {
          lean: false,
          outputFn: app.outputFn,
          restify: app.isRestify,
          fullErrors: true,
          findOneAndUpdate: false
        })
        server = app.listen(testPort, function () {
          request.post({
            url: util.format('%s/api/v1/Customers', testUrl),
            json: {
              name: 'Bob'
            }
          }, function (err, res, body) {
            assert.ok(!err)
            done()
          })
        })
      })

      after(function (done) {
        if (app.close) {
          return app.close(done)
        }
        server.close(done)
      })

      it('Create Bad Customer', function (done) {
        request.post({
          url: util.format('%s/api/v1/Customers', testUrl),
          json: {
            name: 'Bob'
          }
        }, function (err, res, body) {
          assert.ok(!err)
          if (typeof body === 'string') {
            body = JSON.parse(body)
          }
          assert.equal(res.statusCode, 400, 'Wrong status code')
          assert.strictEqual(body.errmsg.indexOf('duplicate key') >= 0,
            true, 'Duplicate key error not found')
          done()
        })
      })

      it('Update Bad Customer', function (done) {
        request.post({
          url: util.format('%s/api/v1/Customers', testUrl),
          json: {
            name: 'Doug'
          }
        }, function (err, res, body) {
          assert.ok(!err)
          request.put({
            url: util.format('%s/api/v1/Customers/%s', testUrl, body._id),
            json: {
              name: 'Bob'
            }
          }, function (err, res, body) {
            assert.ok(!err)
            if (typeof body === 'string') {
              body = JSON.parse(body)
            }

            assert.equal(res.statusCode, 400, 'Wrong status code')
            assert.strictEqual(body.errmsg.indexOf('duplicate key') >= 0,
              true, 'Duplicate key error not found')
            done()

          })

        })
      })
    })

    describe("Option 'name'", function () {
      var server
      var app = createFn()

      setup()

      before(function (done) {
        erm.serve(app, setup.CustomerModel, {
          outputFn: app.outputFn,
          restify: app.isRestify,
          name: 'Customer',
          plural: false
        })
        server = app.listen(testPort, done)
      })

      after(function (done) {
        if (app.close) {
          return app.close(done)
        }
        server.close(done)
      })

      it('is used to specify the endpoint', function (done) {
        this.timeout(100)
        request.get({
          url: util.format('%s/api/v1/Customer', testUrl)
        }, function (err, res) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200, 'Wrong status code')
          done()
        })
      })
    })

    describe('postProcess', function () {
      var savedCustomer
      var server, postProcess
      var app = createFn()

      setup()

      before(function (done) {
        erm.serve(app, setup.CustomerModel, {
          restify: app.isRestify,
          outputFn: app.outputFn,
          postProcess: function (req, res) {
            postProcess(null, req, res)
          }
        })
        server = app.listen(testPort, done)
      })

      after(function (done) {
        if (app.close) {
          return app.close(done)
        }
        server.close(done)
      })

      it('GET', function (done) {
        postProcess = done
        request.get(util.format('%s/api/v1/Customers', testUrl))
      })

      it('POST', function (done) {
        postProcess = done
        request.post({
          url: util.format('%s/api/v1/Customers', testUrl),
          json: {
            name: 'Test',
            comment: 'Comment'
          }
        }, function (err, res, body) {
          assert.ok(!err)
          savedCustomer = body
        })
      })

      it('GET count', function (done) {
        postProcess = done
        request.get({
          url: util.format('%s/api/v1/Customers/count', testUrl),
          json: true
        })
      })

      it('DELETE', function (done) {
        postProcess = done
        request.del({
          url: util.format('%s/api/v1/Customers/%s', testUrl,
            savedCustomer._id),
          json: true
        })
      })
    })

    describe('Use default options', function () {
      var server
      var app = createFn()

      setup()

      before(function (done) {
        erm.defaults({version: '/custom'})

        erm.serve(app, setup.CustomerModel, {
          lowercase: true,
          restify: app.isRestify,
          outputFn: app.outputFn
        })

        server = app.listen(testPort, done)
      })

      after(function (done) {
        erm.defaults(null)

        if (app.close) {
          return app.close(done)
        }

        server.close(done)
      })

      it('200 GET custom/customers', function (done) {
        request.get({
          url: util.format('%s/api/custom/customers', testUrl),
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200, 'Wrong status code')
          done()
        })
      })
    })

    describe('Prereqs', function () {
      describe('allowed', function (done) {
        var savedCustomer
        var server
        var app = createFn()

        setup()

        before(function (done) {
          erm.serve(app, setup.CustomerModel, {
            prereq: function () {
              return true
            },
            restify: app.isRestify,
            outputFn: app.outputFn
          })

          server = app.listen(testPort, done)
        })

        after(function (done) {
          if (app.close) {
            return app.close(done)
          }

          server.close(done)
        })

        it('allows all GET requests', function (done) {
          request.get({
            url: util.format('%s/api/v1/Customers', testUrl),
            json: true
          }, function (err, res, body) {
            assert.ok(!err)
            assert.equal(res.statusCode, 200, 'Wrong status code')
            done()
          })
        })

        it('allows all POST requests', function (done) {
          request.post({
            url: util.format('%s/api/v1/Customers', testUrl),
            json: {
              name: 'Test',
              comment: 'Comment',
              _id: null
            }
          }, function (err, res, body) {
            assert.ok(!err)
            assert.equal(res.statusCode, 201, 'Wrong status code')
            savedCustomer = body
            done()
          })
        })

        it('allows all PUT requests', function (done) {
          savedCustomer.name = 'Test 2'
          savedCustomer.info = savedCustomer.name + ' is awesome'
          request.put({
            url: util.format('%s/api/v1/Customers/%s', testUrl,
              savedCustomer._id),
            json: savedCustomer
          }, function (err, res, body) {
            assert.ok(!err)
            assert.equal(res.statusCode, 200, 'Wrong status code')
            done()
          })
        })

        it('allows all DELETE requests', function (done) {
          request.del({
            url: util.format('%s/api/v1/Customers/%s', testUrl,
              savedCustomer._id),
            json: true
          }, function (err, res) {
            assert.ok(!err)
            assert.equal(res.statusCode, 204, 'Wrong status code')
            done()
          })
        })
      })

      describe('not allowed', function (done) {
        var server
        var app = createFn()

        setup()

        before(function (done) {
          erm.serve(app, setup.CustomerModel, {
            prereq: function () {
              return false
            },
            restify: app.isRestify,
            outputFn: app.outputFn
          })

          server = app.listen(testPort, done)
        })

        after(function (done) {
          if (app.close) {
            return app.close(done)
          }

          server.close(done)
        })

        it('allows all GET requests', function (done) {
          request.get({
            url: util.format('%s/api/v1/Customers', testUrl),
            json: true
          }, function (err, res) {
            assert.ok(!err)
            assert.equal(res.statusCode, 200, 'Wrong status code')
            done()
          })
        })

        it('blocks POST requests', function (done) {
          request.post({
            url: util.format('%s/api/v1/Customers', testUrl),
            json: {
              name: 'Test',
              comment: 'Comment',
              _id: null
            }
          }, function (err, res, body) {
            assert.ok(!err)
            assert.equal(res.statusCode, 403, 'Wrong status code')
            done()
          })
        })

        it('blocks PUT requests', function (done) {
          request.put({
            url: util.format('%s/api/v1/Customers/%s', testUrl,
              43),
            json: {
              name: 'HI'
            }
          }, function (err, res, body) {
            assert.ok(!err)
            assert.equal(res.statusCode, 403, 'Wrong status code')
            done()
          })
        })

        it('blocks DELETE requests', function (done) {
          request.del({
            url: util.format('%s/api/v1/Customers/%s', testUrl,
              43),
            json: true
          }, function (err, res) {
            assert.ok(!err)
            assert.equal(res.statusCode, 403, 'Wrong status code')
            done()
          })
        })
      })
    })

    describe('Access', function () {
      var savedCustomer, server, app, access

      setup()

      before(function (done) {
        erm.defaults({
          'private': 'address',
          'protected': 'comment'
        })

        app = createFn()
        var accessFn = function () {
          return access
        }

        erm.serve(app, setup.CustomerModel, {
          restify: app.isRestify,
          access: accessFn,
          outputFn: app.outputFn
        })

        access = 'private'
        server = app.listen(testPort, function () {
          request.post({
            url: util.format('%s/api/v1/Customers', testUrl),
            json: {
              name: 'Test',
              comment: 'Comment',
              address: '123 Drury Lane',
              creditCard: '123412345612345',
              ssn: '123-45-6789'
            }
          }, function (err, res, body) {
            assert.ok(!err)
            savedCustomer = body
            done()
          })
        })
      })

      after(function (done) {
        if (app.close) {
          return app.close(done)
        }
        server.close(done)

        erm.defaults(null)
      })

      describe('public access', function () {
        before(function () {
          access = 'public'
        })

        it('returns only public fields', function (done) {
          request.get({
            url: util.format('%s/api/v1/Customers/%s', testUrl,
              savedCustomer._id),
            json: true
          }, function (err, res, body) {
            assert.ok(!err)
            assert.equal(body.name, 'Test')
            assert.ok(body.address === undefined,
              'address is not undefined')
            assert.ok(body.comment === undefined,
              'comment is not undefined')
            done()
          })
        })

        it('saves only public fields', function (done) {
          request.post({
            url: util.format('%s/api/v1/Customers', testUrl),
            json: {
              name: 'Test 2',
              comment: 'Comment',
              address: '123 Drury Lane'
            }
          }, function (err, res, body) {
            assert.ok(!err)
            var customer = body

            assert.equal(body.name, 'Test 2')
            assert.ok(body.address === undefined,
              'address is not undefined')
            assert.ok(body.comment === undefined,
              'comment is not undefined')

            access = 'private'
            request.get({
              url: util.format('%s/api/v1/Customers/%s', testUrl,
                customer._id),
              json: true
            }, function (err, res, body) {
              assert.ok(!err)
              assert.equal(body.name, 'Test 2')
              assert.ok(body.address === undefined,
                'address is not undefined')
              assert.ok(body.comment === undefined,
                'comment is not undefined')
              done()
            })
          })
        })
      })

      describe('protected access', function () {
        before(function () {
          access = 'protected'
        })

        it('excludes private fields', function (done) {
          request.get({
            url: util.format('%s/api/v1/Customers/%s', testUrl,
              savedCustomer._id),
            json: true
          }, function (err, res, body) {
            assert.ok(!err)
            assert.equal(body.name, 'Test')
            assert.ok(body.address === undefined,
              'address is not undefined')
            assert.equal(body.comment, 'Comment')
            done()
          })
        })

        it('excludes private fields defined in the schema', function (done) {
          request.get({
            url: util.format('%s/api/v1/Customers/%s', testUrl,
              savedCustomer._id),
            json: true
          }, function (err, res, body) {
            assert.ok(!err)
            assert.equal(body.name, 'Test')
            assert.ok(body.ssn === undefined,
              'ssn not undefined')
            assert.equal(body.comment, 'Comment')
            assert.equal(body.creditCard, '123412345612345')
            done()
          })
        })

        it('does not save private fields', function (done) {
          request.post({
            url: util.format('%s/api/v1/Customers', testUrl),
            json: {
              name: 'Test 3',
              comment: 'Comment',
              address: '123 Drury Lane'
            }
          }, function (err, res, body) {
            assert.ok(!err)
            var customer = body

            assert.equal(body.name, 'Test 3')
            assert.ok(body.address === undefined,
              'address is not undefined')
            assert.equal(body.comment, 'Comment')

            access = 'private'
            request.get({
              url: util.format('%s/api/v1/Customers/%s', testUrl,
                customer._id),
              json: true
            }, function (err, res, body) {
              assert.ok(!err)
              assert.equal(body.name, 'Test 3')
              assert.equal(body.comment, 'Comment')
              assert.ok(body.address === undefined,
                'address is not undefined')
              done()
            })
          })
        })
      })

      describe('private access', function () {
        before(function () {
          access = 'private'
        })

        it('returns all fields', function (done) {
          request.get({
            url: util.format('%s/api/v1/Customers/%s', testUrl,
              savedCustomer._id),
            json: true
          }, function (err, res, body) {
            assert.ok(!err)
            assert.equal(body.name, 'Test')
            assert.equal(body.address, '123 Drury Lane')
            assert.equal(body.comment, 'Comment')
            done()
          })
        })

        it('saves all fields', function (done) {
          request.post({
            url: util.format('%s/api/v1/Customers', testUrl),
            json: {
              name: 'Test 4',
              comment: 'Comment',
              address: '123 Drury Lane'
            }
          }, function (err, res, body) {
            assert.ok(!err)
            var customer = body

            assert.equal(body.name, 'Test 4')
            assert.equal(body.address, '123 Drury Lane')
            assert.equal(body.comment, 'Comment')

            request.get({
              url: util.format('%s/api/v1/Customers/%s', testUrl,
                customer._id),
              json: true
            }, function (err, res, body) {
              assert.ok(!err)
              assert.equal(body.name, 'Test 4')
              assert.equal(body.address, '123 Drury Lane')
              assert.equal(body.comment, 'Comment')

              done()
            })
          })
        })
      })
    })

    describe('Custom Filter', function () {
      describe('Limits actions to items in returned set', function () {
        var badCustomerId
        var goodCustomerId
        var disallowedId
        var server
        var app = createFn()
        var filter = function (model, req, done) {
          done(model.find({address: {$ne: null}, _id: {$ne: disallowedId}}))
        }

        setup()

        before(function (done) {
          erm.defaults({
            restify: app.isRestify,
            outputFn: app.outputFn,
            lean: false,
            contextFilter: filter
          })
          erm.serve(app, setup.CustomerModel)

          setup.CustomerModel.create({
            name: 'A', address: 'addy1'
          }, {
            name: 'B', address: 'addy2'
          }, {
            name: 'C', address: null
          }, {
            name: 'D', address: 'addy3'
          }, function (err, good1, disallowed, bad, good3) {
            assert.ok(!err)
            badCustomerId = bad.id
            goodCustomerId = good1.id
            disallowedId = disallowed.id
            server = app.listen(testPort, done)
          })
        })

        after(function (done) {
          if (app.close) {
            return app.close(done)
          }
          server.close(done)
        })

        it('gets customers with an address', function (done) {
          request.get({
            url: util.format('%s/api/v1/Customers', testUrl),
            json: true
          }, function (err, res, body) {
            assert.ok(!err)
            assert.equal(res.statusCode, 200, 'Wrong status code')
            assert.equal(body.length, 2, 'Wrong number of users')
            done()
          })
        })
        it('cannot get customer without an address', function (done) {
          request.get({
            url: util.format('%s/api/v1/Customers/%s', testUrl, badCustomerId),
            json: true
          }, function (err, res, body) {
            assert.ok(!err)
            assert.equal(res.statusCode, 404, 'Wrong status code')
            done()
          })
        })
        it('cannot get customer disallowed by id', function (done) {
          request.get({
            url: util.format('%s/api/v1/Customers/%s', testUrl, disallowedId),
            json: true
          }, function (err, res, body) {
            assert.ok(!err)
            assert.equal(res.statusCode, 404, 'Wrong status code')
            done()
          })
        })
        it('gets count of customers with an address', function (done) {
          request.get({
            url: util.format('%s/api/v1/Customers/count', testUrl),
            json: true
          }, function (err, res, body) {
            assert.ok(!err)
            assert.equal(res.statusCode, 200, 'Wrong status code')
            assert.equal(body.count, 2, 'Wrong count of users')
            done()
          })
        })
        it('updates customer with an address', function (done) {
          request.put({
            url: util.format('%s/api/v1/Customers/%s', testUrl, goodCustomerId),
            json: {name: 'newName'}
          }, function (err, res, body) {
            assert.ok(!err)
            assert.equal(res.statusCode, 200, 'Wrong status code')
            setup.CustomerModel.findById(goodCustomerId, function (err, customer) {
              assert.ok(!err)
              assert.equal(customer.name, 'newName', 'Customer Deleted')
              done()
            })
          })
        })
        it('cannot update a customer without an address', function (done) {
          request.put({
            url: util.format('%s/api/v1/Customers/%s', testUrl, badCustomerId),
            json: {name: 'newName'}
          }, function (err, res, body) {
            assert.ok(!err)
            assert.equal(res.statusCode, 404, 'Wrong status code')
            setup.CustomerModel.findById(badCustomerId, function (err, customer) {
              assert.ok(!err)
              assert.notEqual(customer.name, 'newName', 'Customer Deleted')
              done()
            })
          })
        })
        it('cannot remove customer without an address by id', function (done) {
          request.del({
            url: util.format('%s/api/v1/Customers/%s', testUrl, badCustomerId),
            json: true
          }, function (err, res, body) {
            assert.ok(!err)
            assert.equal(res.statusCode, 404, 'Wrong status code')
            setup.CustomerModel.count(function (err, count) {
              assert.ok(!err)
              assert.equal(count, 4, 'Customer Deleted')
              done()
            })
          })
        })
        it('cannot remove customer disalllowed by id', function (done) {
          request.del({
            url: util.format('%s/api/v1/Customers/%s', testUrl, disallowedId),
            json: true
          }, function (err, res, body) {
            assert.ok(!err)
            assert.equal(res.statusCode, 404, 'Wrong status code')
            setup.CustomerModel.count(function (err, count) {
              assert.ok(!err)
              assert.equal(count, 4, 'Customer Deleted')
              done()
            })
          })
        })
        it('can remove customer with an address by id', function (done) {
          request.del({
            url: util.format('%s/api/v1/Customers/%s', testUrl, goodCustomerId),
            json: true
          }, function (err, res, body) {
            assert.ok(!err)
            assert.equal(res.statusCode, 204, 'Wrong status code')
            setup.CustomerModel.count(function (err, count) {
              assert.ok(!err)
              assert.equal(count, 3, 'Customer Not Deleted')
              done()
            })
          })
        })
        it.skip('cannot remove customers without an address', function (done) {
          request.del({
            url: util.format('%s/api/v1/Customers', testUrl),
            json: true
          }, function (err, res, body) {
            assert.ok(!err)
            assert.equal(res.statusCode, 400, 'Wrong status code')
            setup.CustomerModel.count(function (err, count) {
              assert.ok(!err)
              assert.equal(count, 3, 'Customer Deleted')
              done()
            })
          })
        })
      })
    })

    describe('limit option', function () {
      var server
      var app = createFn()

      setup()

      before(function (done) {
        erm.defaults({
          restify: app.isRestify,
          outputFn: app.outputFn,
          limit: 2
        })
        erm.serve(app, setup.CustomerModel)

        setup.CustomerModel.create(
          { name: 'A' },
          { name: 'B' },
          { name: 'C' },
          function (err) {
            if (err) {
              done(err)
            }
            server = app.listen(testPort, done)
          }
        )
      })

      after(function (done) {
        if (app.close) {
          return app.close(done)
        }
        server.close(done)
      })

      it('limit: GET Customers/count should return 3', function (done) {
        request.get({
          url: util.format('%s/api/v1/Customers/count', testUrl),
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200, 'Wrong status code')
          assert.equal(body.count, 3, 'Wrong count')
          done()
        })
      })

      it('limit: GET Customers should return 2 objects', function (done) {
        request.get({
          url: util.format('%s/api/v1/Customers', testUrl),
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200, 'Wrong status code')
          assert.ok(Array.isArray(body), 'Body is not an array')
          assert.equal(body.length, 2, 'Wrong count')
          done()
        })
      })

      it('limit: GET Customers should return 2 objects', function (done) {
        request.get({
          url: util.format('%s/api/v1/Customers?limit=3', testUrl),
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200, 'Wrong status code')
          assert.ok(Array.isArray(body), 'Body is not an array')
          assert.equal(body.length, 2, 'Wrong count')
          done()
        })
      })

      it('limit: GET Customers should return 1 object', function (done) {
        request.get({
          url: util.format('%s/api/v1/Customers?limit=1', testUrl),
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200, 'Wrong status code')
          assert.ok(Array.isArray(body), 'Body is not an array')
          assert.equal(body.length, 1, 'Wrong count')
          done()
        })
      })

    })

    describe('postCreate', function () {
      var server
      var error
      var options = {
        postCreate: sinon.spy(function (res, result, done) {
          done(error)
        })
      }
      var app = createFn()
      setup()

      before(function (done) {
        erm.defaults({
          restify: app.isRestify,
          outputFn: app.outputFn,
          lean: false
        })
        erm.serve(app, setup.CustomerModel, options)
        server = app.listen(testPort, done)
      })
      afterEach(function () {
        options.postCreate.reset()
      })
      after(function (done) {
        if (app.close) {
          return app.close(done)
        }
        server.close(done)
      })

      it('is called with the response, result, and a callback', function (done) {
        request.post({
          url: util.format('%s/api/v1/Customers', testUrl),
          json: {
            name: 'A'
          }
        }, function (err, res, body) {
          assert.ok(!err)
          sinon.assert.calledOnce(options.postCreate)
          var args = options.postCreate.args[0]
          assert.equal(args.length, 3)
          assert.equal(typeof args[2], 'function')
          done()
        })
      })
      it('calls next() on success', function (done) {
        error = false
        request.post({
          url: util.format('%s/api/v1/Customers', testUrl),
          json: {
            name: 'B'
          }
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 201)
          done()
        })
      })
      it('sends 400 on failure', function (done) {
        error = new Error()
        request.post({
          url: util.format('%s/api/v1/Customers', testUrl),
          json: {
            name: 'A'
          }
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 400)
          done()
        })
      })
    })

    describe('postDelete', function () {
      var server
      var error
      var customerId
      var options = {
        postDelete: sinon.spy(function (res, result, done) {
          done(error)
        })
      }
      var app = createFn()
      setup()

      before(function (done) {
        erm.defaults({
          restify: app.isRestify,
          outputFn: app.outputFn,
          lean: false
        })
        erm.serve(app, setup.CustomerModel, options)
        server = app.listen(testPort, done)
      })
      beforeEach(function (done) {
        setup.CustomerModel.create({
          name: 'a'
        }, function (err, customer) {
          assert.ok(!err)
          customerId = customer.id
          done()
        })
      })
      afterEach(function (done) {
        options.postDelete.reset()
        setup.CustomerModel.remove(done)
      })
      after(function (done) {
        if (app.close) {
          return app.close(done)
        }
        server.close(done)
      })

      it('is called with the response, result, and a callback (byId)', function (done) {
        request.del({
          url: util.format('%s/api/v1/Customers/%s', testUrl, customerId),
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          sinon.assert.calledOnce(options.postDelete)
          var args = options.postDelete.args[0]
          assert.equal(args.length, 3)
          assert.equal(typeof args[2], 'function')
          done()
        })
      })
      it('calls next() on success (byId)', function (done) {
        error = null
        request.del({
          url: util.format('%s/api/v1/Customers/%s', testUrl, customerId),
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          sinon.assert.calledOnce(options.postDelete)
          assert.equal(res.statusCode, 204)
          done()
        })
      })
      it('sends 400 on failure (byId)', function (done) {
        error = new Error()
        request.del({
          url: util.format('%s/api/v1/Customers/%s', testUrl, customerId),
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          sinon.assert.calledOnce(options.postDelete)
          assert.equal(res.statusCode, 400)
          done()
        })
      })

      it('is called with the response, result, and a callback', function (done) {
        request.del({
          url: util.format('%s/api/v1/Customers/%s', testUrl, customerId),
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          sinon.assert.calledOnce(options.postDelete)
          var args = options.postDelete.args[0]
          assert.equal(args.length, 3)
          assert.equal(typeof args[2], 'function')
          done()
        })
      })
      it('calls next() on success', function (done) {
        error = null
        request.del({
          url: util.format('%s/api/v1/Customers/%s', testUrl, customerId),
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          sinon.assert.calledOnce(options.postDelete)
          assert.equal(res.statusCode, 204)
          done()
        })
      })
      it('sends 400 on failure', function (done) {
        error = new Error()
        request.del({
          url: util.format('%s/api/v1/Customers/%s', testUrl, customerId),
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          sinon.assert.calledOnce(options.postDelete)
          assert.equal(res.statusCode, 400)
          done()
        })
      })
    })

    describe('Id location', function () {
      /*
       Use for an endpoint like:
       /api/v1/Users/Address
       or
       /api/v1/Users/:id/Address
       */
      var server
      var goodCustomerId
      var options = {
        version: '/v1/Entities/:id'
      }
      var app = createFn()
      setup()

      before(function (done) {
        erm.defaults({
          restify: app.isRestify,
          outputFn: app.outputFn,
          lean: false
        })
        erm.serve(app, setup.CustomerModel, options)

        setup.CustomerModel.create({
          name: 'A', address: 'addy1'
        }, function (err, good1) {
          assert.ok(!err)
          goodCustomerId = good1.id
          server = app.listen(testPort, done)
        })
      })

      after(function (done) {
        if (app.close) {
          return app.close(done)
        }
        server.close(done)
      })
      describe('can be located in the middle of the url', function () {
        it('works with GET all', function (done) {
          request.get({
            url: util.format('%s/api/v1/Entities/Customers', testUrl),
            json: true
          }, function (err, res, body) {
            assert.ok(!err)
            assert.equal(res.statusCode, 200, 'Wrong status code')
            assert.equal(body.length, 1, 'Wrong number of users')
            done()
          })
        })
        it('works with GET/:id', function (done) {
          request.get({
            url: util.format('%s/api/v1/Entities/%s/Customers', testUrl,
              goodCustomerId),
            json: true
          }, function (err, res, body) {
            assert.ok(!err)
            assert.equal(res.statusCode, 200, 'Wrong status code')
            done()
          })
        })
        it('works with GET count', function (done) {
          request.get({
            url: util.format('%s/api/v1/Entities/Customers/count', testUrl),
            json: true
          }, function (err, res, body) {
            assert.ok(!err)
            assert.equal(res.statusCode, 200, 'Wrong status code')
            assert.equal(body.count, 1, 'Wrong number of users')
            done()
          })
        })
      })
    })

    describe('Id name', function () {
      var server
      var goodCustomerId
      var options = {
        idProperty: 'name'
      }
      var app = createFn()
      setup()

      before(function (done) {
        erm.defaults({
          restify: app.isRestify,
          outputFn: app.outputFn,
          lean: false
        })
        erm.serve(app, setup.CustomerModel, options)

        setup.CustomerModel.create({
          name: 'A', address: 'addy1'
        }, function (err, good1) {
          assert.ok(!err)
          goodCustomerId = good1.name
          server = app.listen(testPort, done)
        })
      })

      after(function (done) {
        if (app.close) {
          return app.close(done)
        }
        server.close(done)
      })
      describe('can be located in the middle of the url', function () {
        it('works with GET/:id', function (done) {
          request.get({
            url: util.format('%s/api/v1/Customers/%s', testUrl, goodCustomerId),
            json: true
          }, function (err, res, body) {
            assert.ok(!err)
            assert.equal(res.statusCode, 200, 'Wrong status code')
            done()
          })
        })
        it('works with PUT/:id', function (done) {
          request.put({
            url: util.format('%s/api/v1/Customers/%s', testUrl, goodCustomerId),
            json: {address: 'newName'}
          }, function (err, res, body) {
            assert.ok(!err)
            assert.equal(res.statusCode, 200, 'Wrong status code')
            done()
          })
        })
        it('works with DELETE/:id', function (done) {
          request.del({
            url: util.format('%s/api/v1/Customers/%s', testUrl, goodCustomerId),
            json: true
          }, function (err, res, body) {
            assert.ok(!err)
            assert.equal(res.statusCode, 204, 'Wrong status code')
            done()
          })
        })
      })
    })
  })
}
