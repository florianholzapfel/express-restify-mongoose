var mongoose = require('mongoose'),
    Schema   = mongoose.Schema;

var assert = require('assertmessage');

var opts = {
    toObject: { virtuals: true },
    toJSON: { virtuals: true }
};

var Product = new Schema({
    name: { type: String, required: true },
    department: {
        name: String,
        code: Number
    },
    price: Number
});

var Customer = new Schema({
    name: { type: String, required: true },
    comment: String,
    address: String,
    purchases: [{
        item: { type: Schema.Types.ObjectId, ref: 'Product' },
        number: Number
    }]
}, opts);

var Invoice = new Schema({
    customer: { type: Schema.Types.ObjectId, ref: 'Customer' },
    amount: Number,
    products: [{ type: Schema.Types.ObjectId, ref: 'Product' }]
}, {
    versionKey: '__version'
}, opts);

Customer.virtual('info').get(function () {
    return this.name + ' is awesome';
});

var setup = module.exports = function () {
    var self = this;

    if (setup.customerModel) {
        setup.customerModel = mongoose.model('Customer', Customer);
    }
    if (setup.invoiceModel) {
        setup.invoiceModel = mongoose.model('Invoice', Invoice);
    }
    if (setup.productModel) {
        setup.productModel = mongoose.model('Product', Product);
    }

    before(function (done) {
        mongoose.connect('mongodb://localhost/database', function (err) {
            assert(!err, err);
            setup.customerModel.remove(function (err) {
                assert(!err, err);
                setup.invoiceModel.remove(done);
            });
        });
    });

    after(function (done) {
        mongoose.connection.close(done);
    });
};

setup.customerModel = {};
setup.invoiceModel = {};
setup.productModel = {};
