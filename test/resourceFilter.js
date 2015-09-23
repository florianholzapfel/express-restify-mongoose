var assert = require('assert')

describe('resourceFilter', function () {
  var ResourceFilter = require('../lib/resource_filter')

  describe('lean', function () {
    var productModel = {
      modelName: 'Product'
    }

    var product

    beforeEach(function () {
      product = {
        name: 'Garden Hose',
        price: 50,
        department: {
          name: 'Gardening',
          code: 435,
          manager: 'oid'
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
  })
})
