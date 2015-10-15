'use strict'

var Filter = require('../../lib/resource_filter')
var db = require('./setup')()
var assert = require('assert')
var ObjectId = require('mongoose').Types.ObjectId

describe('Resource filter', function () {
  var customerFilter
  var invoiceFilter
  var productFilter

  before(function (done) {
    db.initialize(function (err) {
      if (err) {
        return done(err)
      }

      customerFilter = new Filter(db.models.Customer, {
        private: ['comment', 'address', 'purchases.number', 'purchases.item.price']
      })

      invoiceFilter = new Filter(db.models.Invoice, {
        private: ['amount', 'customer.address', 'products.price']
      })

      productFilter = new Filter(db.models.Product, {
        private: ['price', 'department.code']
      })

      db.reset(done)
    })
  })

  after(function (done) {
    db.close(done)
  })

  describe('lean', function () {
    describe('with populated docs', function () {
      it('excludes fields from populated items', function () {
        var invoice = {
          customer: {
            name: 'John',
            address: '123 Drury Lane'
          },
          amount: 42
        }

        invoice = invoiceFilter.filterObject(invoice, {
          populate: [{
            path: 'customer'
          }]
        })
        assert.ok(invoice.amount === undefined, 'Invoice amount should be excluded')
        assert.ok(invoice.customer.address === undefined, 'Customer address should be excluded')
      })

      it('iterates through array of populated objects', function () {
        var invoice = {
          customer: 'objectid',
          amount: 240,
          products: [{
            name: 'Squirt Gun', price: 42
          }, {
            name: 'Water Balloons', price: 1
          }, {
            name: 'Garden Hose', price: 10
          }]
        }

        invoice = invoiceFilter.filterObject(invoice, {
          populate: [{
            path: 'products'
          }]
        })

        invoice.products.forEach(function (product) {
          assert.ok(product.name !== undefined, 'product name should be populated')
          assert.ok(product.price === undefined, 'product price should be excluded')
        })
      })

      it('filters multiple populated models', function () {
        var invoice = {
          customer: {
            name: 'John',
            address: '123 Drury Lane'
          },
          amount: 240,
          products: [{
            name: 'Squirt Gun', price: 42
          }, {
            name: 'Water Balloons', price: 1
          }, {
            name: 'Garden Hose', price: 10
          }]
        }

        invoice = invoiceFilter.filterObject(invoice, {
          populate: [{
            path: 'customer'
          }, {
            path: 'products'
          }]
        })
        assert.equal(invoice.customer.name, 'John', 'customer name should be populated')
        assert.ok(invoice.customer.address === undefined, 'customer address should be excluded')

        invoice.products.forEach(function (product) {
          assert.ok(product.name !== undefined, 'product name should be populated')
          assert.ok(product.price === undefined, 'product price should be excluded')
        })
      })

      it('filters nested populated docs', function () {
        var customer = {
          name: 'John',
          purchase: {
            item: { name: 'Squirt Gun', price: 42 },
            number: 2
          }
        }

        customer = customerFilter.filterObject(customer, {
          populate: [{
            path: 'purchase.item'
          }]
        })

        assert.ok(customer.purchase.item, 'Purchased item should be included')
        assert.ok(customer.purchase.item.number === undefined, 'Purchased item number should be excluded')
        assert.ok(customer.purchase.item.name !== undefined, 'Purchased item name should be included')
        assert.ok(customer.purchase.item.price === undefined, 'Purchased item price should be excluded')
      })

      it('filters embedded array of populated docs', function () {
        var customer = {
          name: 'John',
          purchases: [{
            item: { name: 'Squirt Gun', price: 42 },
            number: 2
          }, {
            item: { name: 'Water Balloons', price: 1 },
            number: 200
          }, {
            item: { name: 'Garden Hose', price: 10 },
            number: 1
          }]
        }

        customer = customerFilter.filterObject(customer, {
          populate: [{
            path: 'purchases.item'
          }]
        })

        customer.purchases.forEach(function (p) {
          assert.ok(p.number === undefined, 'Purchase number should be excluded')
          assert.ok(p.item.name !== undefined, 'Item name should be populated')
          assert.ok(p.item.price === undefined, 'Item price should be excluded')
        })
      })
    })
  })

  describe('not lean', function () {
    it('excludes items in the excluded string', function () {
      var customer = new db.models.Customer({
        name: 'John',
        address: '123 Drury Lane',
        comment: 'Has a big nose'
      })

      customer = customerFilter.filterObject(customer)
      assert.equal(customer.name, 'John', 'Customer name should be John')
      assert.ok(customer.address === undefined, 'Customer address should be excluded')
      assert.ok(customer.comment === undefined, 'Customer comment should be excluded')
    })

    it('excludes fields from embedded documents', function () {
      var product = new db.models.Product({
        name: 'Garden Hose',
        department: {
          name: 'Gardening',
          code: 435
        }
      })

      product = productFilter.filterObject(product)
      assert.equal(product.name, 'Garden Hose', 'Product name should be included')
      assert.equal(product.department.name, 'Gardening', 'Deparment name should be included')
      assert.ok(product.department.code === undefined, 'Deparment code should be excluded')
    })

    it('excludes fields from embedded arrays', function () {
      var customer = new db.models.Customer({
        name: 'John',
        purchases: [{
          item: new ObjectId(), number: 2
        }, {
          item: new ObjectId(), number: 100
        }, {
          item: new ObjectId(), number: 1
        }]
      })

      customer = customerFilter.filterObject(customer)

      customer.purchases.forEach(function (purchase) {
        assert.ok(purchase.item !== undefined, 'item should be included')
        assert.ok(purchase.number === undefined, 'number should be excluded')
      })
    })

    describe('with populated docs', function () {
      before(function (done) {
        var self = this
        var products = this.products = [{
          name: 'Squirt Gun',
          price: 42
        }, {
          name: 'Water Balloons', price: 1
        }, {
          name: 'Garden Hose', price: 10
        }]

        this.invoiceId = null
        this.customerId = null

        db.models.Product.create(products, function (err, createdProducts) {
          assert(!err, err)
          new db.models.Customer({
            name: 'John',
            address: '123 Drury Lane',
            purchases: [{
              item: createdProducts[0]._id, number: 2
            }, {
              item: createdProducts[1]._id, number: 100
            }, {
              item: createdProducts[2]._id, number: 1
            }],
            purchase: {
              item: createdProducts[0]._id, number: 2
            }
          }).save(function (err, res) {
            assert(!err, err)
            self.customerId = res._id

            new db.models.Invoice({
              customer: res._id,
              amount: 42,
              products: [
                createdProducts[0]._id,
                createdProducts[1]._id,
                createdProducts[2]._id
              ]
            }).save(function (err, res) {
              assert(!err, err)
              self.invoiceId = res._id
              done()
            })
          })
        })
      })

      after(function (done) {
        db.models.Customer.remove(function (err) {
          assert(!err, err)
          db.models.Invoice.remove(function (err) {
            assert(!err, err)
            db.models.Product.remove(done)
          })
        })
      })

      it('excludes fields from populated items', function (done) {
        db.models.Invoice.findById(this.invoiceId).populate('customer').exec(function (err, invoice) {
          assert(!err, err)
          invoice = invoiceFilter.filterObject(invoice, {
            populate: [{
              path: 'customer'
            }]
          })
          assert.ok(invoice.amount === undefined, 'Invoice amount should be excluded')
          assert.ok(invoice.customer.name !== undefined, 'Customer name should be included')
          assert.ok(invoice.customer.address === undefined, 'Customer address should be excluded')
          done()
        })
      })

      it('iterates through array of populated objects', function (done) {
        db.models.Invoice.findById(this.invoiceId).populate('products').exec(function (err, invoice) {
          assert(!err, err)
          invoice = invoiceFilter.filterObject(invoice, {
            populate: [{
              path: 'products'
            }]
          })

          invoice.products.forEach(function (product) {
            assert.ok(product.name !== undefined, 'product name should be populated')
            assert.ok(product.price === undefined, 'product price should be excluded')
          })

          done()
        })
      })

      it('filters multiple populated models', function (done) {
        db.models.Invoice.findById(this.invoiceId).populate('products customer').exec(function (err, invoice) {
          assert(!err, err)
          invoice = invoiceFilter.filterObject(invoice, {
            populate: [{
              path: 'customer'
            }, {
              path: 'products'
            }]
          })
          assert.equal(invoice.customer.name, 'John', 'customer name should be populated')
          assert.ok(invoice.customer.address === undefined, 'customer address should be excluded')

          invoice.products.forEach(function (product) {
            assert.ok(product.name !== undefined, 'product name should be populated')
            assert.ok(product.price === undefined, 'product price should be excluded')
          })

          done()
        })
      })

      it('filters nested populated docs', function (done) {
        db.models.Customer.findById(this.customerId).populate('purchase.item').exec(function (err, customer) {
          assert(!err, err)
          customer = customerFilter.filterObject(customer, {
            populate: [{
              path: 'purchase.item'
            }]
          })

          assert.ok(customer.purchase.item, 'Purchased item should be included')
          assert.ok(customer.purchase.item.number === undefined, 'Purchased item number should be excluded')
          assert.ok(customer.purchase.item.name !== undefined, 'Purchased item name should be included')
          assert.ok(customer.purchase.item.price === undefined, 'Purchased item price should be excluded')

          done()
        })
      })

      it('filters embedded array of populated docs', function (done) {
        var self = this
        db.models.Customer.findById(this.customerId).populate('purchases.item').exec(function (err, customer) {
          assert(!err, err)
          customer = customerFilter.filterObject(customer, {
            populate: [{
              path: 'purchases.item'
            }]
          })

          customer.purchases.forEach(function (p, i) {
            assert.ok(p.number === undefined, 'Purchase number should be excluded')
            assert.equal(p.item.name, self.products[i].name, 'Item name should be populated')
            assert.ok(p.item.price === undefined, 'Item price should be excluded')
          })

          done()
        })
      })
    })
  })

  describe('protected fields', function () {
    it('defaults to not including any', function () {
      invoiceFilter = new Filter(db.models.Invoice, {
        private: ['amount'],
        protected: ['products']
      })

      var invoice = {
        customer: 'objectid',
        amount: 240,
        products: ['objectid']
      }

      invoice = invoiceFilter.filterObject(invoice)
      assert.equal(invoice.customer, 'objectid')
      assert.ok(invoice.amount === undefined, 'Invoice should only have customer')
      assert.ok(invoice.products === undefined, 'Invoice should only have customer')
    })

    it('returns protected fields', function () {
      invoiceFilter = new Filter(db.models.Invoice, {
        private: ['amount'],
        protected: ['products']
      })

      var invoice = {
        customer: 'objectid',
        amount: 240,
        products: ['objectid']
      }

      invoice = invoiceFilter.filterObject(invoice, {
        access: 'protected'
      })

      assert.equal(invoice.customer, 'objectid')
      assert.ok(invoice.amount === undefined, 'Amount should be excluded')
      assert.equal(invoice.products[0], 'objectid', 'Products should be included')
    })
  })

  describe('descriminated schemas', function () {
    // we need the accountFilter to be defined since its creation adds
    // an entry in resource_filter's excludedMap
    var accountFilter // eslint-disable-line no-unused-vars
    var repeatCustFilter

    before(function (done) {
      accountFilter = new Filter(db.models.Account, {
        private: ['accountNumber']
      })

      repeatCustFilter = new Filter(db.models.RepeatCustomer, [])

      db.models.Account.create({
        accountNumber: '123XYZ',
        points: 244
      }, function (err, account) {
        assert(!err, err)
        db.models.RepeatCustomer.create({
          name: 'John Smith',
          loyaltyProgram: account._id
        }, done)
      })
    })

    after(function (done) {
      db.models.Account.remove(function () {
        db.models.Customer.remove(done)
      })
    })

    it('should filter populated from subschema', function (done) {
      db.models.RepeatCustomer.findOne().populate('loyaltyProgram').exec(function (err, doc) {
        assert(!err, err)
        var customer = repeatCustFilter.filterObject(doc, {
          populate: [{
            path: 'loyaltyProgram'
          }]
        })
        assert.equal(customer.name, 'John Smith')
        assert.equal(customer.loyaltyProgram.points, 244)
        assert.ok(customer.loyaltyProgram.accountNumber === undefined, 'account number should be excluded')
        done()
      })
    })

    it('should filter populated from base schema', function (done) {
      db.models.Customer.findOne().exec(function (err, doc) {
        assert(!err, err)
        doc.populate('loyaltyProgram', function (err, doc) {
          assert(!err, err)
          var customer = customerFilter.filterObject(doc, {
            populate: [{
              path: 'loyaltyProgram'
            }]
          })
          assert.equal(customer.name, 'John Smith')
          assert.equal(customer.loyaltyProgram.points, 244)
          assert.ok(customer.loyaltyProgram.accountNumber === undefined, 'account number should be excluded')
          done()
        })
      })
    })
  })
})
