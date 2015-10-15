var assert = require('assert')
var request = require('request')
var util = require('util')

module.exports = function (createFn, setup, dismantle) {
  var erm = require('../../lib/express-restify-mongoose')
  var db = require('./setup')()

  var testPort = 30023
  var testUrl = 'http://localhost:' + testPort

  describe('access', function () {
    describe('private - include private and protected fields', function () {
      var app = createFn()
      var server
      var product
      var customer
      var invoice

      beforeEach(function (done) {
        setup(function (err) {
          if (err) {
            return done(err)
          }

          erm.serve(app, db.models.Customer, {
            private: ['age', 'favorites.animal', 'favorites.purchase.number', 'privateDoes.notExist'],
            protected: ['comment', 'favorites.color', 'protectedDoes.notExist'],
            access: function (req, done) {
              done(null, 'private')
            },
            restify: app.isRestify
          })

          erm.serve(app, db.models.Invoice, {
            private: ['amount'],
            protected: ['receipt'],
            access: function () {
              return 'private'
            },
            restify: app.isRestify
          })

          erm.serve(app, db.models.Product, {
            private: ['department.code'],
            protected: ['price'],
            access: function () {
              return 'private'
            },
            restify: app.isRestify
          })

          db.models.Product.create({
            name: 'Bobsleigh',
            price: 42,
            department: {
              code: 51
            }
          }).then(function (createdProduct) {
            product = createdProduct

            return db.models.Customer.create({
              name: 'Bob',
              age: 12,
              comment: 'Boo',
              favorites: {
                animal: 'Boar',
                color: 'Black',
                purchase: {
                  item: product._id,
                  number: 1
                }
              }
            })
          }).then(function (createdCustomer) {
            customer = createdCustomer

            return db.models.Invoice.create({
              customer: customer._id,
              amount: 100,
              receipt: 'A'
            })
          }).then(function (createdInvoice) {
            invoice = createdInvoice
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
          assert.equal(body[0].name, 'Bob')
          assert.equal(body[0].age, 12)
          assert.equal(body[0].comment, 'Boo')
          assert.deepEqual(body[0].favorites, {
            animal: 'Boar',
            color: 'Black',
            purchase: {
              item: product._id.toHexString(),
              number: 1
            }
          })
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
          assert.equal(body.name, 'Bob')
          assert.equal(body.age, 12)
          assert.equal(body.comment, 'Boo')
          assert.deepEqual(body.favorites, {
            animal: 'Boar',
            color: 'Black',
            purchase: {
              item: product._id.toHexString(),
              number: 1
            }
          })
          done()
        })
      })

      it('GET /Customers?populate=favorites.purchase.item 200', function (done) {
        request.get({
          url: util.format('%s/api/v1/Customers', testUrl),
          qs: {
            populate: 'favorites.purchase.item'
          },
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.length, 1)
          assert.equal(body[0].name, 'Bob')
          assert.equal(body[0].age, 12)
          assert.equal(body[0].comment, 'Boo')
          assert.deepEqual(body[0].favorites, {
            animal: 'Boar',
            color: 'Black',
            purchase: {
              item: {
                __v: 0,
                _id: product._id.toHexString(),
                name: 'Bobsleigh',
                price: 42,
                department: {
                  code: 51
                }
              },
              number: 1
            }
          })
          done()
        })
      })

      it('GET /Customers/:id?populate=favorites.purchase.item 200', function (done) {
        request.get({
          url: util.format('%s/api/v1/Customers/%s', testUrl, customer._id),
          qs: {
            populate: 'favorites.purchase.item'
          },
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.name, 'Bob')
          assert.equal(body.age, 12)
          assert.equal(body.comment, 'Boo')
          assert.deepEqual(body.favorites, {
            animal: 'Boar',
            color: 'Black',
            purchase: {
              item: {
                __v: 0,
                _id: product._id.toHexString(),
                name: 'Bobsleigh',
                price: 42,
                department: {
                  code: 51
                }
              },
              number: 1
            }
          })
          done()
        })
      })

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
          assert.equal(body.length, 1)
          assert.ok(body[0].customer)
          assert.equal(body[0].amount, 100)
          assert.equal(body[0].receipt, 'A')
          assert.equal(body[0].customer.name, 'Bob')
          assert.equal(body[0].customer.age, 12)
          assert.equal(body[0].customer.comment, 'Boo')
          assert.deepEqual(body[0].customer.favorites, {
            animal: 'Boar',
            color: 'Black',
            purchase: {
              item: product._id.toHexString(),
              number: 1
            }
          })
          done()
        })
      })

      it('GET /Invoices/:id?populate=customer 200', function (done) {
        request.get({
          url: util.format('%s/api/v1/Invoices/%s', testUrl, invoice._id),
          qs: {
            populate: 'customer'
          },
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.ok(body.customer)
          assert.equal(body.amount, 100)
          assert.equal(body.receipt, 'A')
          assert.equal(body.customer.name, 'Bob')
          assert.equal(body.customer.age, 12)
          assert.equal(body.customer.comment, 'Boo')
          assert.deepEqual(body.customer.favorites, {
            animal: 'Boar',
            color: 'Black',
            purchase: {
              item: product._id.toHexString(),
              number: 1
            }
          })
          done()
        })
      })

      it('PUT /Customers/:id - saves all fields', function (done) {
        request.put({
          url: util.format('%s/api/v1/Customers/%s', testUrl, customer._id),
          json: {
            name: 'John',
            age: 24,
            comment: 'Jumbo',
            favorites: {
              animal: 'Jaguar',
              color: 'Jade',
              purchase: {
                number: 2
              }
            }
          }
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.name, 'John')
          assert.equal(body.age, 24)
          assert.equal(body.comment, 'Jumbo')
          assert.deepEqual(body.favorites, {
            animal: 'Jaguar',
            color: 'Jade',
            purchase: {
              item: product._id.toHexString(),
              number: 2
            }
          })
          done()
        })
      })
    })

    describe('protected - exclude private fields and include protected fields', function () {
      var app = createFn()
      var server
      var product
      var customer
      var invoice

      beforeEach(function (done) {
        setup(function (err) {
          if (err) {
            return done(err)
          }

          erm.serve(app, db.models.Customer, {
            private: ['age', 'favorites.animal', 'favorites.purchase.number', 'privateDoes.notExist'],
            protected: ['comment', 'favorites.color', 'protectedDoes.notExist'],
            access: function (req, done) {
              done(null, 'protected')
            },
            restify: app.isRestify
          })

          erm.serve(app, db.models.Invoice, {
            private: ['amount'],
            protected: ['receipt'],
            access: function () {
              return 'protected'
            },
            restify: app.isRestify
          })

          erm.serve(app, db.models.Product, {
            private: ['department.code'],
            protected: ['price'],
            access: function () {
              return 'protected'
            },
            restify: app.isRestify
          })

          db.models.Product.create({
            name: 'Bobsleigh',
            price: 42,
            department: {
              code: 51
            }
          }).then(function (createdProduct) {
            product = createdProduct

            return db.models.Customer.create({
              name: 'Bob',
              age: 12,
              comment: 'Boo',
              favorites: {
                animal: 'Boar',
                color: 'Black',
                purchase: {
                  item: product._id,
                  number: 1
                }
              }
            })
          }).then(function (createdCustomer) {
            customer = createdCustomer

            return db.models.Invoice.create({
              customer: customer._id,
              amount: 100,
              receipt: 'A'
            })
          }).then(function (createdInvoice) {
            invoice = createdInvoice
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
          assert.equal(body[0].name, 'Bob')
          assert.equal(body[0].age, undefined)
          assert.equal(body[0].comment, 'Boo')
          assert.deepEqual(body[0].favorites, {
            color: 'Black',
            purchase: {
              item: product._id.toHexString()
            }
          })
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
          assert.equal(body.name, 'Bob')
          assert.equal(body.age, undefined)
          assert.equal(body.comment, 'Boo')
          assert.deepEqual(body.favorites, {
            color: 'Black',
            purchase: {
              item: product._id.toHexString()
            }
          })
          done()
        })
      })

      it('GET /Customers?populate=favorites.purchase.item 200', function (done) {
        request.get({
          url: util.format('%s/api/v1/Customers', testUrl),
          qs: {
            populate: 'favorites.purchase.item'
          },
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.length, 1)
          assert.equal(body[0].name, 'Bob')
          assert.equal(body[0].age, undefined)
          assert.equal(body[0].comment, 'Boo')
          assert.deepEqual(body[0].favorites, {
            color: 'Black',
            purchase: {
              item: {
                __v: 0,
                _id: product._id.toHexString(),
                name: 'Bobsleigh',
                price: 42,
                department: {}
              }
            }
          })
          done()
        })
      })

      it('GET /Customers/:id?populate=favorites.purchase.item 200', function (done) {
        request.get({
          url: util.format('%s/api/v1/Customers/%s', testUrl, customer._id),
          qs: {
            populate: 'favorites.purchase.item'
          },
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.name, 'Bob')
          assert.equal(body.age, undefined)
          assert.equal(body.comment, 'Boo')
          assert.deepEqual(body.favorites, {
            color: 'Black',
            purchase: {
              item: {
                __v: 0,
                _id: product._id.toHexString(),
                name: 'Bobsleigh',
                price: 42,
                department: {}
              }
            }
          })
          done()
        })
      })

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
          assert.equal(body.length, 1)
          assert.ok(body[0].customer)
          assert.equal(body[0].amount, undefined)
          assert.equal(body[0].receipt, 'A')
          assert.equal(body[0].customer.name, 'Bob')
          assert.equal(body[0].customer.age, undefined)
          assert.equal(body[0].customer.comment, 'Boo')
          assert.deepEqual(body[0].customer.favorites, {
            color: 'Black',
            purchase: {
              item: product._id.toHexString()
            }
          })
          done()
        })
      })

      it('GET /Invoices/:id?populate=customer 200', function (done) {
        request.get({
          url: util.format('%s/api/v1/Invoices/%s', testUrl, invoice._id),
          qs: {
            populate: 'customer'
          },
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.ok(body.customer)
          assert.equal(body.amount, undefined)
          assert.equal(body.receipt, 'A')
          assert.equal(body.customer.name, 'Bob')
          assert.equal(body.customer.age, undefined)
          assert.equal(body.customer.comment, 'Boo')
          assert.deepEqual(body.customer.favorites, {
            color: 'Black',
            purchase: {
              item: product._id.toHexString()
            }
          })
          done()
        })
      })

      it('PUT /Customers/:id - saves protected and public fields', function (done) {
        request.put({
          url: util.format('%s/api/v1/Customers/%s', testUrl, customer._id),
          json: {
            name: 'John',
            age: 24,
            comment: 'Jumbo',
            favorites: {
              animal: 'Jaguar',
              color: 'Jade',
              purchase: {
                number: 2
              }
            }
          }
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.name, 'John')
          assert.equal(body.age, undefined)
          assert.equal(body.comment, 'Jumbo')
          assert.deepEqual(body.favorites, {
            color: 'Jade',
            purchase: {
              item: product._id.toHexString()
            }
          })

          db.models.Customer.findById(customer._id, function (err, customer) {
            assert.ok(!err)
            assert.equal(customer.age, 12)
            assert.deepEqual(customer.favorites.toObject(), {
              animal: 'Boar',
              color: 'Jade',
              purchase: {
                item: product._id,
                number: 1
              }
            })
            done()
          })
        })
      })
    })

    describe('public - exclude private and protected fields', function () {
      var app = createFn()
      var server
      var product
      var customer
      var invoice

      beforeEach(function (done) {
        setup(function (err) {
          if (err) {
            return done(err)
          }

          erm.serve(app, db.models.Customer, {
            private: ['age', 'favorites.animal', 'favorites.purchase.number', 'privateDoes.notExist'],
            protected: ['comment', 'favorites.color', 'protectedDoes.notExist'],
            restify: app.isRestify
          })

          erm.serve(app, db.models.Invoice, {
            private: ['amount'],
            protected: ['receipt'],
            restify: app.isRestify
          })

          erm.serve(app, db.models.Product, {
            private: ['department.code'],
            protected: ['price'],
            restify: app.isRestify
          })

          db.models.Product.create({
            name: 'Bobsleigh',
            price: 42,
            department: {
              code: 51
            }
          }).then(function (createdProduct) {
            product = createdProduct

            return db.models.Customer.create({
              name: 'Bob',
              age: 12,
              comment: 'Boo',
              favorites: {
                animal: 'Boar',
                color: 'Black',
                purchase: {
                  item: product._id,
                  number: 1
                }
              }
            })
          }).then(function (createdCustomer) {
            customer = createdCustomer

            return db.models.Invoice.create({
              customer: customer._id,
              amount: 100,
              receipt: 'A'
            })
          }).then(function (createdInvoice) {
            invoice = createdInvoice
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
          assert.equal(body[0].name, 'Bob')
          assert.equal(body[0].age, undefined)
          assert.equal(body[0].comment, undefined)
          assert.deepEqual(body[0].favorites, {
            purchase: {
              item: product._id.toHexString()
            }
          })
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
          assert.equal(body.name, 'Bob')
          assert.equal(body.age, undefined)
          assert.equal(body.comment, undefined)
          assert.deepEqual(body.favorites, {
            purchase: {
              item: product._id.toHexString()
            }
          })
          done()
        })
      })

      it('GET /Customers?populate=favorites.purchase.item 200', function (done) {
        request.get({
          url: util.format('%s/api/v1/Customers', testUrl),
          qs: {
            populate: 'favorites.purchase.item'
          },
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.length, 1)
          assert.equal(body[0].name, 'Bob')
          assert.equal(body[0].age, undefined)
          assert.equal(body[0].comment, undefined)
          assert.deepEqual(body[0].favorites, {
            purchase: {
              item: {
                __v: 0,
                _id: product._id.toHexString(),
                name: 'Bobsleigh',
                department: {}
              }
            }
          })
          done()
        })
      })

      it('GET /Customers/:id?populate=favorites.purchase.item 200', function (done) {
        request.get({
          url: util.format('%s/api/v1/Customers/%s', testUrl, customer._id),
          qs: {
            populate: 'favorites.purchase.item'
          },
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.name, 'Bob')
          assert.equal(body.age, undefined)
          assert.equal(body.comment, undefined)
          assert.deepEqual(body.favorites, {
            purchase: {
              item: {
                __v: 0,
                _id: product._id.toHexString(),
                name: 'Bobsleigh',
                department: {}
              }
            }
          })
          done()
        })
      })

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
          assert.equal(body.length, 1)
          assert.ok(body[0].customer)
          assert.equal(body[0].amount, undefined)
          assert.equal(body[0].receipt, undefined)
          assert.equal(body[0].customer.name, 'Bob')
          assert.equal(body[0].customer.age, undefined)
          assert.equal(body[0].customer.comment, undefined)
          assert.deepEqual(body[0].customer.favorites, {
            purchase: {
              item: product._id.toHexString()
            }
          })
          done()
        })
      })

      it('GET /Invoices/:id?populate=customer 200', function (done) {
        request.get({
          url: util.format('%s/api/v1/Invoices/%s', testUrl, invoice._id),
          qs: {
            populate: 'customer'
          },
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.ok(body.customer)
          assert.equal(body.amount, undefined)
          assert.equal(body.receipt, undefined)
          assert.equal(body.customer.name, 'Bob')
          assert.equal(body.customer.age, undefined)
          assert.equal(body.customer.comment, undefined)
          assert.deepEqual(body.customer.favorites, {
            purchase: {
              item: product._id.toHexString()
            }
          })
          done()
        })
      })

      it('PUT /Customers/:id - saves public fields', function (done) {
        request.put({
          url: util.format('%s/api/v1/Customers/%s', testUrl, customer._id),
          json: {
            name: 'John',
            age: 24,
            comment: 'Jumbo',
            favorites: {
              animal: 'Jaguar',
              color: 'Jade',
              purchase: {
                number: 2
              }
            }
          }
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 200)
          assert.equal(body.name, 'John')
          assert.equal(body.age, undefined)
          assert.equal(body.comment, undefined)
          assert.deepEqual(body.favorites, {
            purchase: {
              item: product._id.toHexString()
            }
          })

          db.models.Customer.findById(customer._id, function (err, customer) {
            assert.ok(!err)
            assert.equal(customer.age, 12)
            assert.equal(customer.comment, 'Boo')
            assert.deepEqual(customer.favorites.toObject(), {
              animal: 'Boar',
              color: 'Black',
              purchase: {
                item: product._id,
                number: 1
              }
            })
            done()
          })
        })
      })
    })

    describe('yields an error', function () {
      var app = createFn()
      var server

      beforeEach(function (done) {
        setup(function (err) {
          if (err) {
            return done(err)
          }

          erm.serve(app, db.models.Customer, {
            access: function (req, done) {
              var err = new Error('Something went wrong')
              done(err)
            },
            restify: app.isRestify
          })

          server = app.listen(testPort, done)
        })
      })

      afterEach(function (done) {
        dismantle(app, server, done)
      })

      it('GET /Customers 500', function (done) {
        request.get({
          url: util.format('%s/api/v1/Customers', testUrl),
          json: true
        }, function (err, res, body) {
          assert.ok(!err)
          assert.equal(res.statusCode, 500)
          // assert.equal(body.message, 'Something went wrong')
          done()
        })
      })
    })
  })
}
