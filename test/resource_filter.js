'use strict';

var Filter = require('../lib/resource_filter');

var setup = require('./setup');

var assert = require('assertmessage'),
    OID = require('mongoose').Types.ObjectId;

describe('Filter', function () {
    setup();

    var customerFilter = new Filter(setup.customerModel,
                                    ['comment',
                                     'address',
                                     'purchases.number',
									 'purchases.item.price']),
        invoiceFilter = new Filter(setup.invoiceModel,
									['amount',
									'customer.address',
									'products.price']),
        productFilter = new Filter(setup.productModel,
                                   ['price', 'department.code']);

    describe('lean', function () {
        it('excludes items in the excluded string', function () {
            var customer = {
                name: 'John',
                address: '123 Drury Lane',
                comment: 'Has a big nose'
            };

            customer = customerFilter.filterObject(customer);
            assert.equal(customer.name, 'John', 'Customer name should be John');
            assert.ok(customer.address === undefined,
                      'Customer address should be excluded');
            assert.ok(customer.comment === undefined,
                      'Customer comment should be excluded');
        });

        it('excludes fields from embedded documents', function () {
            var product = {
                name: 'Garden Hose',
                department: {
                    name: 'Gardening',
                    code: 435
                }
            };

            product = productFilter.filterObject(product);
            assert.equal(product.name, 'Garden Hose',
                         'Product name should be included');
            assert.equal(product.department.name, 'Gardening',
                         'Deparment name should be included');
            assert.ok(product.department.code === undefined,
                         'Deparment code should be excluded');
        });

        it('excludes fields from embedded arrays', function () {
            var customer = {
                name: 'John',
                purchases: [
                    {item: 'oid', number: 2},
                    {item: 'oid', number: 100},
                    {item: 'oid', number: 1}
                ]
            };

            customer = customerFilter.filterObject(customer);
            customer.purchases.forEach(function (purchase) {
                assert.equal(purchase.item, 'oid', 'item should be included');
                assert.ok(purchase.number === undefined,
                          'number should be excluded');
            });
        });

        describe('with populated docs', function () {
            it('excludes fields from populated items', function () {
                var invoice = {
                    customer: {
                        name: 'John',
                        address: '123 Drury Lane'
                    },
                    amount: 42
                };

                invoice = invoiceFilter
                    .filterObject(invoice, { populate: 'customer' });
                assert.ok(invoice.amount === undefined,
                          'Invoice amount should be excluded');
                assert.ok(invoice.customer.address === undefined,
                          'Customer address should be excluded');
            });

            it('iterates through array of populated objects', function () {
                var invoice = {
                    customer: 'objectid',
                    amount: 240,
                    products: [
                        { name: 'Squirt Gun', price: 42 },
                        { name: 'Water Balloons', price: 1 },
                        { name: 'Garden Hose', price: 10 }
                    ]
                };

                invoice = invoiceFilter.filterObject(invoice,
                                                  {populate: 'products'});
                invoice.products.forEach(function (product) {
                    assert.ok(product.name !== undefined,
                              'product name should be populated');

                    assert.ok(product.price === undefined,
                              'product price should be excluded');

                });
            });

            it('filters multiple populated models', function () {
                var invoice = {
                    customer: {
                        name: 'John',
                        address: '123 Drury Lane'
                    },
                    amount: 240,
                    products: [
                        { name: 'Squirt Gun', price: 42 },
                        { name: 'Water Balloons', price: 1 },
                        { name: 'Garden Hose', price: 10 }
                    ]
                };

                invoice = invoiceFilter
                    .filterObject(invoice, {populate: 'products,customer'});
                assert.equal(invoice.customer.name, 'John',
                              'customer name should be populated');
                assert.ok(invoice.customer.address === undefined,
                              'customer address should be excluded');
                invoice.products.forEach(function (product) {
                    assert.ok(product.name !== undefined,
                              'product name should be populated');

                    assert.ok(product.price === undefined,
                              'product price should be excluded');

                });
            });

            it('filters embedded array of populated docs', function () {
                var customer = {
                    name: 'John',
                    purchases: [
                        {
                            item: { name: 'Squirt Gun', price: 42 },
                            number: 2
                        }, {
                            item: { name: 'Water Balloons', price: 1 },
                            number: 200
                        }, {
                            item: { name: 'Garden Hose', price: 10 },
                            number: 1
                        }
                    ]
                };

                customer = customerFilter
                    .filterObject(customer, {populate: 'purchases.item'});
                customer.purchases.forEach(function (p) {
                    assert.ok(p.number === undefined,
                             'Purchase number should be excluded');
                    assert.ok(p.item.name !== undefined,
                             'Item name should be populated');
                    assert.ok(p.item.price === undefined,
                             'Item price should be excluded');
                });
            });
        });
    });

    describe('not lean', function () {
        it('excludes items in the excluded string', function () {
            var customer = new setup.customerModel({
                name: 'John',
                address: '123 Drury Lane',
                comment: 'Has a big nose'
            });

            customer = customerFilter.filterObject(customer);
            assert.equal(customer.name, 'John', 'Customer name should be John');
            assert.ok(customer.address === undefined,
                      'Customer address should be excluded');
            assert.ok(customer.comment === undefined,
                      'Customer comment should be excluded');
        });

        it('excludes fields from embedded documents', function () {
            var product = new setup.productModel({
                name: 'Garden Hose',
                department: {
                    name: 'Gardening',
                    code: 435
                }
            });

            product = productFilter.filterObject(product);
            assert.equal(product.name, 'Garden Hose',
                         'Product name should be included');
            assert.equal(product.department.name, 'Gardening',
                         'Deparment name should be included');
            assert.ok(product.department.code === undefined,
                         'Deparment code should be excluded');
        });

        it('excludes fields from embedded arrays', function () {
            var customer = new setup.customerModel({
                name: 'John',
                purchases: [
                    {item: new OID(), number: 2},
                    {item: new OID(), number: 100},
                    {item: new OID(), number: 1}
                ]
            });

            customer = customerFilter.filterObject(customer);
            customer.purchases.forEach(function (purchase) {
                assert.ok(purchase.item !== undefined,
                          'item should be included');
                assert.ok(purchase.number === undefined,
                          'number should be excluded');
            });
        });

        describe('with populated docs', function () {
            before(function (done) {
                var self = this,
                    products = this.products = [
                        { name: 'Squirt Gun', price: 42 },
                        { name: 'Water Balloons', price: 1 },
                        { name: 'Garden Hose', price: 10 }
                    ];
                this.invoiceId = null;
                this.customerId = null;

                setup.productModel.create(products, function (err, createdProducts) {
                    new setup.customerModel({
                        name: 'John',
                        address: '123 Drury Lane',
                        purchases: [
                            { item: createdProducts[0]._id, number: 2 },
                            { item: createdProducts[1]._id, number: 100 },
                            { item: createdProducts[2]._id, number: 1 }
                        ]
                    }).save(function (err, res) {
                        self.customerId = res._id;

                        new setup.invoiceModel({
                            customer: res._id,
                            amount: 42,
                            products: [
                                createdProducts[0]._id,
                                createdProducts[1]._id,
                                createdProducts[2]._id
                            ]
                        }).save(function (err, res) {
                            self.invoiceId = res._id;
                            done();
                        });
                    });
                });
            });

            after(function (done) {
                setup.customerModel.remove(function (err) {
                    assert(!err, err);
                    setup.invoiceModel.remove(function (err) {
                        assert(!err, err);
                        setup.productModel.remove(done);
                    });
                });
            });

            it('excludes fields from populated items', function (done) {
                setup.invoiceModel.findById(this.invoiceId).populate('customer')
                .exec(function (err, invoice) {
                    invoice = invoiceFilter
                        .filterObject(invoice, {populate: 'customer'});
                    assert.ok(invoice.amount === undefined,
                              'Invoice amount should be excluded');
                    assert.ok(invoice.customer.name !== undefined,
                              'Customer name should be included');

                    assert.ok(invoice.customer.address === undefined,
                              'Customer address should be excluded');
                    done();
                });
            });

            it('iterates through array of populated objects', function (done) {
                setup.invoiceModel.findById(this.invoiceId).populate('products')
                .exec(function (err, invoice) {
                    invoice = invoiceFilter
                        .filterObject(invoice, {populate: 'products'});
                    invoice.products.forEach(function (product) {
                        assert.ok(product.name !== undefined,
                                  'product name should be populated');

                        assert.ok(product.price === undefined,
                                  'product price should be excluded');

                    });
                    done();
                });
            });

            it('filters multiple populated models', function (done) {
                setup.invoiceModel.findById(this.invoiceId)
                .populate('products customer').exec(function (err, invoice) {
                    invoice = invoiceFilter
                       .filterObject(invoice, {populate: 'products,customer'});
                    assert.equal(invoice.customer.name, 'John',
                                  'customer name should be populated');
                    assert.ok(invoice.customer.address === undefined,
                                  'customer address should be excluded');
                    invoice.products.forEach(function (product) {
                        assert.ok(product.name !== undefined,
                                  'product name should be populated');

                        assert.ok(product.price === undefined,
                                  'product price should be excluded');

                    });
                    done();
                });
            });

            it('filters embedded array of populated docs', function (done) {
                var self = this;
                setup.customerModel.findById(this.customerId)
                .populate('purchases.item').exec(function (err, customer) {
                    customer = customerFilter
                      .filterObject(customer, {populate: 'purchases.item'});
                    customer.purchases.forEach(function (p, i) {
                        assert.ok(p.number === undefined,
                                 'Purchase number should be excluded');
                        assert.equal(p.item.name, self.products[i].name,
                                 'Item name should be populated');
                        assert.ok(p.item.price === undefined,
                                 'Item price should be excluded');
                    });
                    done();
                });
            });
        });
    });

    describe('protected fields', function () {
        it('defaults to not including any', function () {
            invoiceFilter = new Filter(setup.invoiceModel,
                                       ['amount'],
                                       ['products']);

            var invoice = {
                customer: 'objectid',
                amount: 240,
                products: [ 'objectid' ]
            };

            invoice = invoiceFilter.filterObject(invoice);
            assert.equal(invoice.customer, 'objectid');
            assert.ok(invoice.amount === undefined,
                         'Invoice should only have customer');
            assert.ok(invoice.products === undefined,
                         'Invoice should only have customer');
        });

        it('returns protected fields', function () {
            invoiceFilter = new Filter(setup.invoiceModel,
                                       ['amount'],
                                       ['products']);

            var invoice = {
                customer: 'objectid',
                amount: 240,
                products: [ 'objectid' ]
            };

            invoice = invoiceFilter.filterObject(invoice,
                                                 { access: 'protected' });
            assert.equal(invoice.customer, 'objectid');
            assert.ok(invoice.amount === undefined,
                         'Amount should be excluded');
            assert.equal(invoice.products[0], 'objectid',
                         'Products should be included');
        });
    });

    describe('descriminated schemas', function () {
        var accountFilter = new Filter(setup.accountModel, ['accountNumber']);
        var repeatCustFilter = new Filter(setup.repeatCustomerModel, []);

        before(function (done) {
            setup.accountModel.create({
                accountNumber: '123XYZ',
                points: 244
            }, function (err, account) {
                setup.repeatCustomerModel.create({
                    name: 'John Smith',
                    loyaltyProgram: account._id
                }, done);
            });
        });

        after(function (done) {
            setup.accountModel.remove(function () {
                setup.customerModel.remove(done);
            });
        });

        it('should filter populated from subschema', function (done) {
            setup.repeatCustomerModel.findOne().populate('loyaltyProgram')
            .exec(function (err, doc) {
                var customer = repeatCustFilter
                  .filterObject(doc, {populate: 'loyaltyProgram'});
                assert.equal(customer.name, 'John Smith');
                assert.equal(customer.loyaltyProgram.points, 244);
                assert.ok(customer.loyaltyProgram.accountNumber === undefined,
                             'account number should be excluded');
                done();
            });
        });

        it('should filter populated from base schema', function (done) {
            setup.customerModel.findOne()
            .exec(function (err, doc) {
                doc.populate('loyaltyProgram', function (err, doc) {
                    var customer = customerFilter
                      .filterObject(doc, {populate: 'loyaltyProgram'});
                    assert.equal(customer.name, 'John Smith');
                    assert.equal(customer.loyaltyProgram.points, 244);
                    assert.ok(customer.loyaltyProgram.accountNumber ===
                              undefined,
                             'account number should be excluded');
                    done();
                });
            });
        });
    });
});
