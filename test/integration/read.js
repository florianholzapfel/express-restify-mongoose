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
          restify: app.isRestify
        })

        erm.serve(app, db.models.Invoice, {
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

          return db.models.Invoice.create([{
            customer: customers[0]._id,
            amount: 100,
            receipt: 'A'
          }, {
            customer: customers[1]._id,
            amount: 200,
            receipt: 'B'
          }, {
            customer: customers[2]._id,
            amount: 300,
            receipt: 'C'
          }])
        }).then(function (createdInvoices) {
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

    describe('ignore unknown parameters', function () {
      it('GET /Customers?foo=bar 200', function (done) {
        request.get({
          url: util.format('%s/api/v1/Customers', testUrl),
          qs: {
            foo: 'bar'
          },
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.length, 3)
          done()
        })
      })
    })

    describe('limit', function () {
      it('GET /Customers?limit=1 200', function (done) {
        request.get({
          url: util.format('%s/api/v1/Customers', testUrl),
          qs: {
            limit: 1
          },
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.length, 1)
          done()
        })
      })
    })

    describe('skip', function () {
      it('GET /Customers?skip=1 200', function (done) {
        request.get({
          url: util.format('%s/api/v1/Customers', testUrl),
          qs: {
            skip: 1
          },
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.length, 2)
          done()
        })
      })
    })

    describe('sort', function () {
      it('GET /Customers?sort=name 200', function (done) {
        request.get({
          url: util.format('%s/api/v1/Customers', testUrl),
          qs: {
            sort: 'name'
          },
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

      it('GET /Customers?sort=-name 200', function (done) {
        request.get({
          url: util.format('%s/api/v1/Customers', testUrl),
          qs: {
            sort: '-name'
          },
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.length, 3)
          assert.equal(body[0].name, 'Mike')
          assert.equal(body[1].name, 'John')
          assert.equal(body[2].name, 'Bob')
          done()
        })
      })

      it('GET /Customers?sort={"name":1} 200', function (done) {
        request.get({
          url: util.format('%s/api/v1/Customers', testUrl),
          qs: {
            sort: {
              name: 1
            }
          },
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

      it('GET /Customers?sort={"name":-1} 200', function (done) {
        request.get({
          url: util.format('%s/api/v1/Customers', testUrl),
          qs: {
            sort: {
              name: -1
            }
          },
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.length, 3)
          assert.equal(body[0].name, 'Mike')
          assert.equal(body[1].name, 'John')
          assert.equal(body[2].name, 'Bob')
          done()
        })
      })
    })

    describe('query', function () {
      it('GET /Customers?query={} 200 - empty object', function (done) {
        request.get({
          url: util.format('%s/api/v1/Customers', testUrl),
          qs: {
            query: JSON.stringify({})
          },
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.length, 3)
          done()
        })
      })

      it('GET /Customers?query=invalidJson 400 - invalid json', function (done) {
        request.get({
          url: util.format('%s/api/v1/Customers', testUrl),
          qs: {
            query: 'invalidJson'
          },
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 400)
          done()
        })
      })

      describe('string', function () {
        it('GET /Customers?query={"name":"John"} 200 - exact match', function (done) {
          request.get({
            url: util.format('%s/api/v1/Customers', testUrl),
            qs: {
              query: JSON.stringify({
                name: 'John'
              })
            },
            json: true
          }, function (err, res, body) {
            assert.ok(!err)
            assert.equal(res.statusCode, 200)
            assert.equal(body.length, 1)
            assert.equal(body[0].name, 'John')
            done()
          })
        })

        it('GET /Customers?query={"name":"~^J"} 200 - name starting with', function (done) {
          request.get({
            url: util.format('%s/api/v1/Customers', testUrl),
            qs: {
              query: JSON.stringify({
                name: '~^J'
              })
            },
            json: true
          }, function (err, res, body) {
            assert.ok(!err)
            assert.equal(res.statusCode, 200)
            assert.equal(body.length, 1)
            assert.ok(body[0].name[0] === 'J')
            done()
          })
        })

        it('GET /Customers?query={"name":">=John"} 200 - greater than or equal', function (done) {
          request.get({
            url: util.format('%s/api/v1/Customers', testUrl),
            qs: {
              query: JSON.stringify({
                name: '>=John'
              })
            },
            json: true
          }, function (err, res, body) {
            assert.ok(!err)
            assert.equal(res.statusCode, 200)
            assert.equal(body.length, 2)
            assert.ok(body[0].name >= 'John')
            assert.ok(body[1].name >= 'John')
            done()
          })
        })

        it('GET /Customers?query={"name":">John"} 200 - greater than', function (done) {
          request.get({
            url: util.format('%s/api/v1/Customers', testUrl),
            qs: {
              query: JSON.stringify({
                name: '>John'
              })
            },
            json: true
          }, function (err, res, body) {
            assert.ok(!err)
            assert.equal(res.statusCode, 200)
            assert.equal(body.length, 1)
            assert.ok(body[0].name > 'John')
            done()
          })
        })

        it('GET /Customers?query={"name":"<=John"} 200 - lower than or equal', function (done) {
          request.get({
            url: util.format('%s/api/v1/Customers', testUrl),
            qs: {
              query: JSON.stringify({
                name: '<=John'
              })
            },
            json: true
          }, function (err, res, body) {
            assert.ok(!err)
            assert.equal(res.statusCode, 200)
            assert.equal(body.length, 2)
            assert.ok(body[0].name[0] <= 'John')
            assert.ok(body[1].name[0] <= 'John')
            done()
          })
        })

        it('GET /Customers?query={"name":"<John"} 200 - lower than', function (done) {
          request.get({
            url: util.format('%s/api/v1/Customers', testUrl),
            qs: {
              query: JSON.stringify({
                name: '<John'
              })
            },
            json: true
          }, function (err, res, body) {
            assert.ok(!err)
            assert.equal(res.statusCode, 200)
            assert.equal(body.length, 1)
            assert.ok(body[0].name[0] < 'John')
            done()
          })
        })

        it('GET /Customers?query={"name":"!=John"} 200 - not equal', function (done) {
          request.get({
            url: util.format('%s/api/v1/Customers', testUrl),
            qs: {
              query: JSON.stringify({
                name: '!=John'
              })
            },
            json: true
          }, function (err, res, body) {
            assert.ok(!err)
            assert.equal(res.statusCode, 200)
            assert.equal(body.length, 2)
            assert.notEqual(body[0].name, 'John')
            assert.notEqual(body[1].name, 'John')
            done()
          })
        })

        // This feature was disabled because it requires MongoDB 3
        it.skip('GET /Customers?query={"name":"=John"} 200 - equal', function (done) {
          request.get({
            url: util.format('%s/api/v1/Customers', testUrl),
            qs: {
              query: JSON.stringify({
                name: '=John'
              })
            },
            json: true
          }, function (err, res, body) {
            assert.ok(!err)
            assert.equal(res.statusCode, 200)
            assert.equal(body.length, 1)
            assert.ok(body[0].name === 'John')
            done()
          })
        })

        it('GET /Customers?query={"name":["Bob","John"]} 200 - in', function (done) {
          request.get({
            url: util.format('%s/api/v1/Customers', testUrl),
            qs: {
              query: JSON.stringify({
                name: ['Bob', 'John']
              })
            },
            json: true
          }, function (err, res, body) {
            assert.ok(!err)
            assert.equal(res.statusCode, 200)
            assert.equal(body.length, 2)
            assert.equal(body[0].name, 'Bob')
            assert.equal(body[1].name, 'John')
            done()
          })
        })
      })

      describe('number', function () {
        it('GET /Customers?query={"age":"24"} 200 - exact match', function (done) {
          request.get({
            url: util.format('%s/api/v1/Customers', testUrl),
            qs: {
              query: JSON.stringify({
                age: 24
              })
            },
            json: true
          }, function (err, res, body) {
            assert.ok(!err)
            assert.equal(res.statusCode, 200)
            assert.equal(body.length, 1)
            assert.equal(body[0].age, 24)
            done()
          })
        })

        it('GET /Customers?query={"age":"~2"} 400 - regex on number field', function (done) {
          request.get({
            url: util.format('%s/api/v1/Customers', testUrl),
            qs: {
              query: JSON.stringify({
                age: '~2'
              })
            },
            json: true
          }, function (err, res, body) {
            assert.ok(!err)
            assert.equal(res.statusCode, 400)
            done()
          })
        })

        it('GET /Customers?query={"age":">=24"} 200 - greater than or equal', function (done) {
          request.get({
            url: util.format('%s/api/v1/Customers', testUrl),
            qs: {
              query: JSON.stringify({
                age: '>=24'
              })
            },
            json: true
          }, function (err, res, body) {
            assert.ok(!err)
            assert.equal(res.statusCode, 200)
            assert.equal(body.length, 2)
            assert.ok(body[0].age >= 24)
            assert.ok(body[1].age >= 24)
            done()
          })
        })

        it('GET /Customers?query={"age":">24"} 200 - greater than', function (done) {
          request.get({
            url: util.format('%s/api/v1/Customers', testUrl),
            qs: {
              query: JSON.stringify({
                age: '>24'
              })
            },
            json: true
          }, function (err, res, body) {
            assert.ok(!err)
            assert.equal(res.statusCode, 200)
            assert.equal(body.length, 1)
            assert.ok(body[0].age > 24)
            done()
          })
        })

        it('GET /Customers?query={"age":"<=24"} 200 - lower than or equal', function (done) {
          request.get({
            url: util.format('%s/api/v1/Customers', testUrl),
            qs: {
              query: JSON.stringify({
                age: '<=24'
              })
            },
            json: true
          }, function (err, res, body) {
            assert.ok(!err)
            assert.equal(res.statusCode, 200)
            assert.equal(body.length, 2)
            assert.ok(body[0].age <= 24)
            assert.ok(body[1].age <= 24)
            done()
          })
        })

        it('GET /Customers?query={"age":"<24"} 200 - lower than', function (done) {
          request.get({
            url: util.format('%s/api/v1/Customers', testUrl),
            qs: {
              query: JSON.stringify({
                age: '<24'
              })
            },
            json: true
          }, function (err, res, body) {
            assert.ok(!err)
            assert.equal(res.statusCode, 200)
            assert.equal(body.length, 1)
            assert.equal(body[0].age, 12)
            done()
          })
        })

        it('GET /Customers?query={"age":"!=24"} 200 - not equal', function (done) {
          request.get({
            url: util.format('%s/api/v1/Customers', testUrl),
            qs: {
              query: JSON.stringify({
                age: '!=24'
              })
            },
            json: true
          }, function (err, res, body) {
            assert.ok(!err)
            assert.equal(res.statusCode, 200)
            assert.equal(body.length, 2)
            assert.notEqual(body[0].age, 24)
            assert.notEqual(body[1].age, 24)
            done()
          })
        })

        // This feature was disabled because it requires MongoDB 3
        it.skip('GET /Customers?query={"age":"=24"} 200 - equal', function (done) {
          request.get({
            url: util.format('%s/api/v1/Customers', testUrl),
            qs: {
              query: JSON.stringify({
                age: '=24'
              })
            },
            json: true
          }, function (err, res, body) {
            assert.ok(!err)
            assert.equal(res.statusCode, 200)
            assert.equal(body.length, 1)
            assert.equal(body[0].age, 24)
            done()
          })
        })

        it('GET /Customers?query={"age":["12","24"]} 200 - in', function (done) {
          request.get({
            url: util.format('%s/api/v1/Customers', testUrl),
            qs: {
              query: JSON.stringify({
                age: ['12', '24']
              })
            },
            json: true
          }, function (err, res, body) {
            assert.ok(!err)
            assert.equal(res.statusCode, 200)
            assert.equal(body.length, 2)
            assert.equal(body[0].age, 12)
            assert.equal(body[1].age, 24)
            done()
          })
        })
      })
    })

    describe('select', function () {
      it('GET /Customers?select=name 200 - only include ', function (done) {
        request.get({
          url: util.format('%s/api/v1/Customers', testUrl),
          qs: {
            select: 'name'
          },
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.length, 3)
          body.forEach(function (item) {
            assert.equal(Object.keys(item).length, 2)
            assert.ok(item._id)
            assert.ok(item.name)
          })
          done()
        })
      })

      it('GET /Customers?select=-name 200 - exclude name', function (done) {
        request.get({
          url: util.format('%s/api/v1/Customers', testUrl),
          qs: {
            select: '-name'
          },
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.length, 3)
          body.forEach(function (item) {
            assert.ok(item.name === undefined)
          })
          done()
        })
      })

      it('GET /Customers?select={"name":1} 200 - only include name', function (done) {
        request.get({
          url: util.format('%s/api/v1/Customers', testUrl),
          qs: {
            select: JSON.stringify({
              name: 1
            })
          },
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.length, 3)
          body.forEach(function (item) {
            assert.equal(Object.keys(item).length, 2)
            assert.ok(item._id)
            assert.ok(item.name)
          })
          done()
        })
      })

      it('GET /Customers?select={"name":0} 200 - exclude name', function (done) {
        request.get({
          url: util.format('%s/api/v1/Customers', testUrl),
          qs: {
            select: JSON.stringify({
              name: 0
            })
          },
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.length, 3)
          body.forEach(function (item) {
            assert.ok(item.name === undefined)
          })
          done()
        })
      })
    })

    describe('populate', function () {
      it('GET /Invoices?populate=customer 200', function (done) {
        request.get({
          url: util.format('%s/api/v1/Invoices', testUrl),
          qs: {
            populate: 'customer'
          },
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.length, 3)
          body.forEach(function (invoice) {
            assert.ok(invoice.customer)
            assert.ok(invoice.customer._id)
            assert.ok(invoice.customer.name)
            assert.ok(invoice.customer.age)
          })
          done()
        })
      })

      it('GET /Invoices?populate={path:"customer"} 200', function (done) {
        request.get({
          url: util.format('%s/api/v1/Invoices', testUrl),
          qs: {
            populate: JSON.stringify({
              path: 'customer'
            })
          },
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.length, 3)
          body.forEach(function (invoice) {
            assert.ok(invoice.customer)
            assert.ok(invoice.customer._id)
            assert.ok(invoice.customer.name)
            assert.ok(invoice.customer.age)
          })
          done()
        })
      })

      it('GET /Invoices?populate=[{path:"customer"}] 200', function (done) {
        request.get({
          url: util.format('%s/api/v1/Invoices', testUrl),
          qs: {
            populate: JSON.stringify([{
              path: 'customer'
            }])
          },
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.length, 3)
          body.forEach(function (invoice) {
            assert.ok(invoice.customer)
            assert.ok(invoice.customer._id)
            assert.ok(invoice.customer.name)
            assert.ok(invoice.customer.age)
          })
          done()
        })
      })

      describe('with select', function () {
        it('GET Invoices?populate=customer&select=amount 200 - only include amount and customer document', function (done) {
          request.get({
            url: util.format('%s/api/v1/Invoices', testUrl),
            qs: {
              populate: 'customer',
              select: 'amount'
            },
            json: true
          }, function (err, res, body) {
            assert.ok(!err)
            assert.equal(res.statusCode, 200)
            assert.equal(body.length, 3)
            body.forEach(function (invoice) {
              assert.ok(invoice.amount)
              assert.ok(invoice.customer)
              assert.ok(invoice.customer._id)
              assert.ok(invoice.customer.name)
              assert.ok(invoice.customer.age)
              assert.equal(invoice.receipt, undefined)
            })
            done()
          })
        })

        it('GET Invoices?populate=customer&select=amount,customer.name 200 - only include amount and customer name', function (done) {
          request.get({
            url: util.format('%s/api/v1/Invoices', testUrl),
            qs: {
              populate: 'customer',
              select: 'amount,customer.name'
            },
            json: true
          }, function (err, res, body) {
            assert.ok(!err)
            assert.equal(res.statusCode, 200)
            assert.equal(body.length, 3)
            body.forEach(function (invoice) {
              assert.ok(invoice.amount)
              assert.ok(invoice.customer)
              assert.ok(invoice.customer._id)
              assert.ok(invoice.customer.name)
              assert.equal(invoice.customer.age, undefined)
              assert.equal(invoice.receipt, undefined)
            })
            done()
          })
        })

        it('GET Invoices?populate=customer&select=customer.name 200 - include all invoice fields, but only include customer name', function (done) {
          request.get({
            url: util.format('%s/api/v1/Invoices', testUrl),
            qs: {
              populate: 'customer',
              select: 'customer.name'
            },
            json: true
          }, function (err, res, body) {
            assert.ok(!err)
            assert.equal(res.statusCode, 200)
            assert.equal(body.length, 3)
            body.forEach(function (invoice) {
              assert.ok(invoice.amount)
              assert.ok(invoice.receipt)
              assert.ok(invoice.customer)
              assert.ok(invoice.customer._id)
              assert.ok(invoice.customer.name)
              assert.equal(invoice.customer.age, undefined)
            })
            done()
          })
        })

        it('GET Invoices?populate=customer&select=-customer.name 200 - include all invoice and fields, but exclude customer name', function (done) {
          request.get({
            url: util.format('%s/api/v1/Invoices', testUrl),
            qs: {
              populate: 'customer',
              select: '-customer.name'
            },
            json: true
          }, function (err, res, body) {
            assert.ok(!err)
            assert.equal(res.statusCode, 200)
            assert.equal(body.length, 3)
            body.forEach(function (invoice) {
              assert.ok(invoice.amount)
              assert.ok(invoice.receipt)
              assert.ok(invoice.customer)
              assert.ok(invoice.customer._id)
              assert.ok(invoice.customer.age)
              assert.equal(invoice.customer.name, undefined)
            })
            done()
          })
        })

        it('GET Invoices?populate=customer&select=amount,-customer.-id,customer.name 200 - only include amount and customer name and exclude customer _id', function (done) {
          request.get({
            url: util.format('%s/api/v1/Invoices', testUrl),
            qs: {
              populate: 'customer',
              select: 'amount,-customer._id,customer.name'
            },
            json: true
          }, function (err, res, body) {
            assert.ok(!err)
            assert.equal(res.statusCode, 200)
            assert.equal(body.length, 3)
            body.forEach(function (invoice) {
              assert.ok(invoice.amount)
              assert.ok(invoice.customer)
              assert.ok(invoice.customer.name)
              assert.equal(invoice.receipt, undefined)
              assert.equal(invoice.customer._id, undefined)
              assert.equal(invoice.customer.age, undefined)
            })
            done()
          })
        })

        it('GET Invoices?populate=customer&select=customer.name,customer.age 200 - only include customer name and age', function (done) {
          request.get({
            url: util.format('%s/api/v1/Invoices', testUrl),
            qs: {
              populate: 'customer',
              select: 'customer.name,customer.age'
            },
            json: true
          }, function (err, res, body) {
            assert.ok(!err)
            assert.equal(res.statusCode, 200)
            assert.equal(body.length, 3)
            body.forEach(function (invoice) {
              assert.ok(invoice.amount)
              assert.ok(invoice.receipt)
              assert.ok(invoice.customer)
              assert.ok(invoice.customer._id)
              assert.ok(invoice.customer.name)
              assert.ok(invoice.customer.age)
            })
            done()
          })
        })
      })
    })

    describe('distinct', function () {
      it('GET /Customers?distinct=name 200 - array of unique names', function (done) {
        request.get({
          url: util.format('%s/api/v1/Customers', testUrl),
          qs: {
            distinct: 'name'
          },
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.length, 3)
          assert.equal(body[0], 'Bob')
          assert.equal(body[1], 'John')
          assert.equal(body[2], 'Mike')
          done()
        })
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
