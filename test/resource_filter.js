var Filter = require('../lib/resource_filter');

var setup = require('./setup');

var assert = require('assertmessage'),
    OID = require('mongoose').Types.ObjectId;

require('sugar');

describe('Filter', function () {
    setup();

    describe('lean', function () {
        var customerFilter = new Filter(setup.customerModel,
                                        'comment,address,purchases.number',
                                        true),
            invoiceFilter = new Filter(setup.invoiceModel, 'amount', true),
            productFilter = new Filter(setup.productModel,
                                       'price,department.code', true);

        it('excludes items in the excluded string', function () {
            var customer = {
                name: 'John',
                address: '123 Drury Lane',
                comment: 'Has a big nose'
            };

            customer = customerFilter.getFilter(customer);
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

            product = productFilter.getFilter(product);
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

            customer = customerFilter.getFilter(customer);
            customer.purchases.each(function (purchase) {
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

                invoice = invoiceFilter.getFilter(invoice, 'customer');
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

                invoice = invoiceFilter.getFilter(invoice, 'products');
                invoice.products.each(function (product) {
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

                invoice = invoiceFilter.getFilter(invoice, 'products,customer');
                assert.equal(invoice.customer.name, 'John',
                              'customer name should be populated');
                assert.ok(invoice.customer.address === undefined,
                              'customer address should be excluded');
                invoice.products.each(function (product) {
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

                customer = customerFilter.getFilter(customer, 'purchases.item');
                customer.purchases.each(function (p) {
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
        var customerFilter = new Filter(setup.customerModel,
                                        'comment,address,purchases.number',
                                        false),
            invoiceFilter = new Filter(setup.invoiceModel, 'amount', false),
            productFilter = new Filter(setup.productModel,
                                       'price,department.code', false);

        it('excludes items in the excluded string', function () {
            var customer = new setup.customerModel({
                name: 'John',
                address: '123 Drury Lane',
                comment: 'Has a big nose'
            });

            customer = customerFilter.getFilter(customer);
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

            product = productFilter.getFilter(product);
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

            customer = customerFilter.getFilter(customer);
            customer.purchases.each(function (purchase) {
                assert.ok(purchase.item !== undefined,
                          'item should be included');
                assert.ok(purchase.number === undefined,
                          'number should be excluded');
            });
        });

        describe('with populated docs', function () {
            before(function (done) {
                var self = this,
                    products = [
                        { name: 'Squirt Gun', price: 42 },
                        { name: 'Water Balloons', price: 1 },
                        { name: 'Garden Hose', price: 10 }
                    ];
                this.invoiceId = null;
                this.customerId = null;

                setup.productModel.create(products, function (err, p1, p2, p3) {
                    new setup.customerModel({
                        name: 'John',
                        address: '123 Drury Lane',
                        purchases: [
                            { item: p1._id, number: 2 },
                            { item: p2._id, number: 100 },
                            { item: p3._id, number: 1 },
                        ]
                    }).save(function (err, res) {
                        self.customerId = res._id;

                        new setup.invoiceModel({
                            customer: res._id,
                            amount: 42,
                            products: [p1._id, p2._id, p3._id]
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
                    invoice = invoiceFilter.getFilter(invoice, 'customer');
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
                    invoice = invoiceFilter.getFilter(invoice, 'products');
                    invoice.products.each(function (product) {
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
                    invoice = invoiceFilter.getFilter(invoice,
                                                      'products,customer');
                    assert.equal(invoice.customer.name, 'John',
                                  'customer name should be populated');
                    assert.ok(invoice.customer.address === undefined,
                                  'customer address should be excluded');
                    invoice.products.each(function (product) {
                        assert.ok(product.name !== undefined,
                                  'product name should be populated');

                        assert.ok(product.price === undefined,
                                  'product price should be excluded');

                    });
                    done();
                });
            });

            it('filters embedded array of populated docs', function (done) {
                setup.customerModel.findById(this.customerId)
                .populate('purchases.item').exec(function (err, customer) {
                    customer = customerFilter.getFilter(customer,
                                                        'purchases.item');
                    customer.purchases.each(function (p) {
                        assert.ok(p.number === undefined,
                                 'Purchase number should be excluded');
                        assert.ok(p.item.name !== undefined,
                                 'Item name should be populated');
                        assert.ok(p.item.price === undefined,
                                 'Item price should be excluded');
                    });
                    done();
                });
            });
        });
    });
});
