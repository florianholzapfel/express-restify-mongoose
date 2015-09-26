var assert = require('assert')
var sinon = require('sinon')

describe('resourceFilter', function () {
  var ResourceFilter = require('../lib/resource_filter')

  describe('lean', function () {
    var returnFieldRef = function (field) {
      return {
        options: {
          ref: field.charAt(0).toUpperCase() + field.slice(1)
        },
        schema: (function () {
          switch (field) {
            case 'purchases':
              return customerModel.schema
            case 'related':
              return productModel.schema
            default:
              return
          }
        })()
      }
    }

    var customerModel = {
      modelName: 'Customer',
      schema: {
        path: sinon.spy(returnFieldRef)
      }
    }

    var invoiceModel = {
      modelName: 'Invoice',
      schema: {
        path: sinon.spy(returnFieldRef)
      }
    }

    var productModel = {
      modelName: 'Product',
      schema: {
        path: sinon.spy(returnFieldRef)
      }
    }

    var customer, invoice, product

    beforeEach(function () {
      customerModel.schema.path.reset()
      invoiceModel.schema.path.reset()
      productModel.schema.path.reset()

      customer = {
        firstname: 'John',
        lastname: 'Smith',
        purchases: [{
          item: { name: 'Squirt Gun', price: 42 },
          quantity: 2
        }, {
          item: { name: 'Water Balloons', price: 1 },
          quantity: 200
        }, {
          item: { name: 'Garden Hose', price: 10 },
          quantity: 1
        }]
      }

      invoice = {
        customer: 'oid',
        product: ['oid', 'oid'],
        price: 100
      }

      product = {
        name: 'Garden Hose',
        price: 50,
        department: {
          name: 'Gardening',
          code: 435,
          manager: 'Florian'
        },
        purchases: [{
          customer: 'oid', quantity: 2
        }, {
          customer: 'oid', quantity: 100
        }],
        related: [{
          product: 'oid', name: 'Flowers'
        }, {
          product: 'oid', name: 'Bird'
        }]
      }
    })

    describe('public access', function () {
      it('includes all fields', function () {
        var productFilter = new ResourceFilter(productModel)

        var filteredProduct = productFilter.filterObject(product)

        assert.ok(filteredProduct.name, 'name should be included')
        assert.ok(filteredProduct.price, 'price should be included')
        assert.ok(filteredProduct.department, 'department should be included')
        assert.ok(filteredProduct.purchases, 'purchases should be included')
        assert.ok(filteredProduct.related, 'related should be included')
      })

      it('excludes private and protected fields', function () {
        var productFilter = new ResourceFilter(productModel, {
          private: ['department', 'purchases'],
          protected: ['related']
        })

        var filteredProduct = productFilter.filterObject(product)

        assert.ok(filteredProduct.name, 'name should be included')
        assert.ok(filteredProduct.price, 'price should be included')
        assert.ok(!filteredProduct.department, 'department should be excluded')
        assert.ok(!filteredProduct.purchases, 'purchases should be excluded')
        assert.ok(!filteredProduct.related, 'related should be excluded')
      })

      it('excludes private and protected fields from embedded documents', function () {
        var productFilter = new ResourceFilter(productModel, {
          private: ['department.name'],
          protected: ['department.code']
        })

        var filteredProduct = productFilter.filterObject(product)

        assert.ok(filteredProduct.name, 'name should be included')
        assert.ok(filteredProduct.price, 'price should be included')
        assert.ok(filteredProduct.department, 'department should be included')
        assert.ok(filteredProduct.department.manager, 'manager should be included')
        assert.ok(!filteredProduct.department.name, 'department name should be excluded')
        assert.ok(!filteredProduct.department.code, 'department code should be excluded')
        assert.ok(filteredProduct.purchases, 'purchases should be included')
        assert.ok(filteredProduct.related, 'related should be included')
      })

      it('excludes private and protected fields from embedded arrays', function () {
        var productFilter = new ResourceFilter(productModel, {
          private: ['purchases.customer'],
          protected: ['related.product']
        })

        var filteredProduct = productFilter.filterObject(product)

        assert.ok(filteredProduct.name, 'name should be included')
        assert.ok(filteredProduct.price, 'price should be included')
        assert.ok(filteredProduct.department, 'department should be included')
        filteredProduct.purchases.forEach(function (purchase) {
          assert.ok(purchase.quantity, 'purchased quantity should be included')
          assert.ok(!purchase.customer, 'purchased customer should be excluded')
        })
        filteredProduct.related.forEach(function (relatedProduct) {
          assert.ok(relatedProduct.name, 'related name should be included')
          assert.ok(!relatedProduct.product, 'related product should be excluded')
        })
      })
    })

    describe('protected access', function () {
      it('includes all fields', function () {
        var productFilter = new ResourceFilter(productModel)

        var filteredProduct = productFilter.filterObject(product, {
          access: 'protected'
        })

        assert.ok(filteredProduct.name, 'name should be included')
        assert.ok(filteredProduct.price, 'price should be included')
        assert.ok(filteredProduct.department, 'department should be included')
        assert.ok(filteredProduct.purchases, 'purchases should be included')
        assert.ok(filteredProduct.related, 'related should be included')
      })

      it('excludes private and includes protected fields', function () {
        var productFilter = new ResourceFilter(productModel, {
          private: ['department', 'purchases'],
          protected: ['related']
        })

        var filteredProduct = productFilter.filterObject(product, {
          access: 'protected'
        })

        assert.ok(filteredProduct.name, 'name should be included')
        assert.ok(filteredProduct.price, 'price should be included')
        assert.ok(!filteredProduct.department, 'department should be excluded')
        assert.ok(!filteredProduct.purchases, 'purchases should be excluded')
        assert.ok(filteredProduct.related, 'related should be included')
      })

      it('excludes private and includes protected fields from embedded documents', function () {
        var productFilter = new ResourceFilter(productModel, {
          private: ['department.name'],
          protected: ['department.code']
        })

        var filteredProduct = productFilter.filterObject(product, {
          access: 'protected'
        })

        assert.ok(filteredProduct.name, 'name should be included')
        assert.ok(filteredProduct.price, 'price should be included')
        assert.ok(filteredProduct.department, 'department should be included')
        assert.ok(filteredProduct.department.manager, 'manager should be included')
        assert.ok(!filteredProduct.department.name, 'department name should be excluded')
        assert.ok(filteredProduct.department.code, 'department code should be included')
        assert.ok(filteredProduct.purchases, 'purchases should be included')
        assert.ok(filteredProduct.related, 'related should be included')
      })

      it('excludes private and includes protected fields from embedded arrays', function () {
        var productFilter = new ResourceFilter(productModel, {
          private: ['purchases.customer'],
          protected: ['related.product']
        })

        var filteredProduct = productFilter.filterObject(product, {
          access: 'protected'
        })

        assert.ok(filteredProduct.name, 'name should be included')
        assert.ok(filteredProduct.price, 'price should be included')
        assert.ok(filteredProduct.department, 'department should be included')
        filteredProduct.purchases.forEach(function (purchase) {
          assert.ok(purchase.quantity, 'purchased quantity should be included')
          assert.ok(!purchase.customer, 'purchased customer should be excluded')
        })
        filteredProduct.related.forEach(function (relatedProduct) {
          assert.ok(relatedProduct.name, 'related name should be included')
          assert.ok(relatedProduct.product, 'related product should be included')
        })
      })
    })

    describe('private access', function () {
      it('includes all fields', function () {
        var productFilter = new ResourceFilter(productModel)

        var filteredProduct = productFilter.filterObject(product, {
          access: 'private'
        })

        assert.ok(filteredProduct.name, 'name should be included')
        assert.ok(filteredProduct.price, 'price should be included')
        assert.ok(filteredProduct.department, 'department should be included')
        assert.ok(filteredProduct.purchases, 'purchases should be included')
        assert.ok(filteredProduct.related, 'related should be included')
      })

      it('includes private and protected fields', function () {
        var productFilter = new ResourceFilter(productModel, {
          private: ['department', 'purchases'],
          protected: ['related']
        })

        var filteredProduct = productFilter.filterObject(product, {
          access: 'private'
        })

        assert.ok(filteredProduct.name, 'name should be included')
        assert.ok(filteredProduct.price, 'price should be included')
        assert.ok(filteredProduct.department, 'department should be included')
        assert.ok(filteredProduct.purchases, 'purchases should be included')
        assert.ok(filteredProduct.related, 'related should be included')
      })

      it('includes private and protected fields from embedded documents', function () {
        var productFilter = new ResourceFilter(productModel, {
          private: ['department.name'],
          protected: ['department.code']
        })

        var filteredProduct = productFilter.filterObject(product, {
          access: 'private'
        })

        assert.ok(filteredProduct.name, 'name should be included')
        assert.ok(filteredProduct.price, 'price should be included')
        assert.ok(filteredProduct.department, 'department should be included')
        assert.ok(filteredProduct.department.manager, 'manager should be included')
        assert.ok(filteredProduct.department.name, 'department name should be included')
        assert.ok(filteredProduct.department.code, 'department code should be included')
        assert.ok(filteredProduct.purchases, 'purchases should be included')
        assert.ok(filteredProduct.related, 'related should be included')
      })

      it('includes private and protected fields from embedded arrays', function () {
        var productFilter = new ResourceFilter(productModel, {
          private: ['purchases.customer'],
          protected: ['related.product']
        })

        var filteredProduct = productFilter.filterObject(product, {
          access: 'private'
        })

        assert.ok(filteredProduct.name, 'name should be included')
        assert.ok(filteredProduct.price, 'price should be included')
        assert.ok(filteredProduct.department, 'department should be included')
        filteredProduct.purchases.forEach(function (purchase) {
          assert.ok(purchase.quantity, 'purchased quantity should be included')
          assert.ok(purchase.customer, 'purchased customer should be included')
        })
        filteredProduct.related.forEach(function (relatedProduct) {
          assert.ok(relatedProduct.name, 'related name should be included')
          assert.ok(relatedProduct.product, 'related product should be included')
        })
      })
    })

    describe('with populated documents', function () {
      it('excludes private and protected fields from a populated object', function () {
        // Evil side effect
        var customerFilter = new ResourceFilter(customerModel, { // eslint-disable-line no-unused-vars
          private: ['purchases'],
          protected: ['firstname']
        })

        var invoiceFilter = new ResourceFilter(invoiceModel, {
          private: ['product']
        })

        invoice.customer = customer

        var filteredInvoice = invoiceFilter.filterObject(invoice, {
          populate: [{
            path: 'customer'
          }]
        })

        assert.ok(filteredInvoice.price, 'price should be included')
        assert.ok(filteredInvoice.customer, 'customer should be included')
        assert.ok(filteredInvoice.customer.lastname, "customer's lastname should be included")
        assert.ok(!filteredInvoice.product, 'product should be excluded')
        assert.ok(!filteredInvoice.customer.firstname, "customer's firstname should be excluded")
        assert.ok(!filteredInvoice.customer.purchases, "customer's purchases should be excluded")
      })

      it('excludes private and protected fields from arrays of populated object', function () {
        // Evil side effect
        var productFilter = new ResourceFilter(productModel, { // eslint-disable-line no-unused-vars
          private: ['purchases'],
          protected: ['related']
        })

        var invoiceFilter = new ResourceFilter(invoiceModel, {
          private: ['customer']
        })

        invoice.product = [product, product]

        var filteredInvoice = invoiceFilter.filterObject(invoice, {
          populate: [{
            path: 'product'
          }]
        })

        assert.ok(filteredInvoice.price, 'price should be included')
        assert.ok(filteredInvoice.product, 'product should be included')
        assert.ok(!filteredInvoice.customer, 'customer should be excluded')
        filteredInvoice.product.forEach(function (product) {
          assert.ok(product.name, "product's name should be included")
          assert.ok(product.price, "product's price should be included")
          assert.ok(product.department, "product's department should be included")
          assert.ok(!product.purchases, "product's purchases should be excluded")
          assert.ok(!product.related, "product's related should be excluded")
        })
      })

      it('excludes private and protected fields from arrays of nested populated objects', function () {
        // Evil side effect
        var customerFilter = new ResourceFilter(customerModel, { // eslint-disable-line no-unused-vars
          private: ['purchases'],
          protected: ['firstname']
        })

        var productFilter = new ResourceFilter(productModel, {
          private: ['related']
        })

        product.purchases.forEach(function (purchase) {
          purchase.customer = customer
        })

        var filteredProduct = productFilter.filterObject(product, {
          populate: [{
            path: 'purchases.customer'
          }]
        })

        assert.ok(filteredProduct.name, 'name should be included')
        assert.ok(filteredProduct.price, 'price should be included')
        assert.ok(filteredProduct.department, 'department should be included')
        assert.ok(!filteredProduct.related, 'related should be excluded')
        filteredProduct.purchases.forEach(function (purchase) {
          assert.ok(purchase.quantity, 'purchase quantity should be included')
          assert.ok(purchase.customer, 'purchase customer should be included')
          assert.ok(purchase.customer.lastname, 'purchase customer should be included')
          assert.ok(!purchase.customer.firstname, "purchase customer's firstname should be excluded")
          assert.ok(!purchase.customer.purchases, "purchase customer's purchases should be excluded")
        })
      })
    })
  })
})
