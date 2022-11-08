"use strict";

const Filter = require("../../src/resource_filter");
const db = require("./setup")();
const assert = require("assert");
const ObjectId = require("mongoose").Types.ObjectId;

describe("Resource filter", () => {
  let customerFilter;
  let invoiceFilter;
  let productFilter;

  before((done) => {
    db.initialize((err) => {
      if (err) {
        return done(err);
      }

      customerFilter = new Filter({
        model: db.models.Customer,
        filteredKeys: {
          private: [
            "comment",
            "address",
            "favorites.purchase.number",
            "purchases.number",
            "purchases.item.price",
          ],
        },
      });

      invoiceFilter = new Filter({
        model: db.models.Invoice,
        filteredKeys: {
          private: ["amount", "customer.address", "products.price"],
        },
      });

      productFilter = new Filter({
        model: db.models.Product,
        filteredKeys: {
          private: ["price", "department.code"],
        },
      });

      db.reset(done);
    });
  });

  after((done) => {
    db.close(done);
  });

  describe("lean", () => {
    describe("with populated docs", () => {
      it("excludes fields from populated items", () => {
        let invoice = {
          customer: {
            name: "John",
            address: "123 Drury Lane",
          },
          amount: 42,
        };

        invoice = invoiceFilter.filterObject(invoice, {
          populate: [
            {
              path: "customer",
            },
          ],
        });
        assert.ok(
          invoice.amount === undefined,
          "Invoice amount should be excluded"
        );
        assert.ok(
          invoice.customer.address === undefined,
          "Customer address should be excluded"
        );
      });

      it("iterates through array of populated objects", () => {
        let invoice = {
          customer: "objectid",
          amount: 240,
          products: [
            {
              name: "Squirt Gun",
              price: 42,
            },
            {
              name: "Water Balloons",
              price: 1,
            },
            {
              name: "Garden Hose",
              price: 10,
            },
          ],
        };

        invoice = invoiceFilter.filterObject(invoice, {
          populate: [
            {
              path: "products",
            },
          ],
        });

        invoice.products.forEach((product) => {
          assert.ok(
            product.name !== undefined,
            "product name should be populated"
          );
          assert.ok(
            product.price === undefined,
            "product price should be excluded"
          );
        });
      });

      it("filters multiple populated models", () => {
        let invoice = {
          customer: {
            name: "John",
            address: "123 Drury Lane",
          },
          amount: 240,
          products: [
            {
              name: "Squirt Gun",
              price: 42,
            },
            {
              name: "Water Balloons",
              price: 1,
            },
            {
              name: "Garden Hose",
              price: 10,
            },
          ],
        };

        invoice = invoiceFilter.filterObject(invoice, {
          populate: [
            {
              path: "customer",
            },
            {
              path: "products",
            },
          ],
        });
        assert.equal(
          invoice.customer.name,
          "John",
          "customer name should be populated"
        );
        assert.ok(
          invoice.customer.address === undefined,
          "customer address should be excluded"
        );

        invoice.products.forEach((product) => {
          assert.ok(
            product.name !== undefined,
            "product name should be populated"
          );
          assert.ok(
            product.price === undefined,
            "product price should be excluded"
          );
        });
      });

      it.skip("filters nested populated docs", () => {
        let customer = {
          name: "John",
          favorites: {
            purchase: {
              item: { name: "Squirt Gun", price: 42 },
              number: 2,
            },
          },
        };

        customer = customerFilter.filterObject(customer, {
          populate: [
            {
              path: "favorites.purchase.item",
            },
          ],
        });

        assert.ok(
          customer.favorites.purchase.item,
          "Purchased item should be included"
        );
        assert.ok(
          customer.favorites.purchase.item.name !== undefined,
          "Purchased item name should be included"
        );
        assert.ok(
          customer.favorites.purchase.item.price === undefined,
          "Purchased item price should be excluded"
        );
        assert.ok(
          customer.favorites.purchase.number === undefined,
          "Purchased item number should be excluded"
        );
      });

      it("filters embedded array of populated docs", () => {
        let customer = {
          name: "John",
          purchases: [
            {
              item: { name: "Squirt Gun", price: 42 },
              number: 2,
            },
            {
              item: { name: "Water Balloons", price: 1 },
              number: 200,
            },
            {
              item: { name: "Garden Hose", price: 10 },
              number: 1,
            },
          ],
        };

        customer = customerFilter.filterObject(customer, {
          populate: [
            {
              path: "purchases.item",
            },
          ],
        });

        customer.purchases.forEach((p) => {
          assert.ok(
            p.number === undefined,
            "Purchase number should be excluded"
          );
          assert.ok(p.item, "Item should be included");
          assert.ok(p.item.name !== undefined, "Item name should be populated");
          assert.ok(
            p.item.price === undefined,
            "Item price should be excluded"
          );
        });
      });
    });
  });

  describe("not lean", () => {
    it("excludes items in the excluded string", () => {
      let customer = new db.models.Customer({
        name: "John",
        address: "123 Drury Lane",
        comment: "Has a big nose",
      });

      customer = customerFilter.filterObject(customer);
      assert.equal(customer.name, "John", "Customer name should be John");
      assert.ok(
        customer.address === undefined,
        "Customer address should be excluded"
      );
      assert.ok(
        customer.comment === undefined,
        "Customer comment should be excluded"
      );
    });

    it("excludes fields from embedded documents", () => {
      let product = new db.models.Product({
        name: "Garden Hose",
        department: {
          name: "Gardening",
          code: 435,
        },
      });

      product = productFilter.filterObject(product);
      assert.equal(
        product.name,
        "Garden Hose",
        "Product name should be included"
      );
      assert.equal(
        product.department.name,
        "Gardening",
        "Deparment name should be included"
      );
      assert.ok(
        product.department.code === undefined,
        "Deparment code should be excluded"
      );
    });

    it("excludes fields from embedded arrays", () => {
      let customer = new db.models.Customer({
        name: "John",
        purchases: [
          {
            item: new ObjectId(),
            number: 2,
          },
          {
            item: new ObjectId(),
            number: 100,
          },
          {
            item: new ObjectId(),
            number: 1,
          },
        ],
      });

      customer = customerFilter.filterObject(customer);

      customer.purchases.forEach((purchase) => {
        assert.ok(purchase.item !== undefined, "item should be included");
        assert.ok(purchase.number === undefined, "number should be excluded");
      });
    });

    describe("with populated docs", () => {
      let products;
      let invoiceId;
      let customerId;

      before((done) => {
        products = [
          {
            name: "Squirt Gun",
            department: {
              code: 51,
            },
            price: 42,
          },
          {
            name: "Water Balloons",
            department: {
              code: 819,
            },
            price: 1,
          },
          {
            name: "Garden Hose",
            department: {
              code: 555,
            },
            price: 10,
          },
        ];

        db.models.Product.create(products, (err, createdProducts) => {
          assert(!err, err);
          new db.models.Customer({
            name: "John",
            address: "123 Drury Lane",
            purchases: [
              {
                item: createdProducts[0]._id,
                number: 2,
              },
              {
                item: createdProducts[1]._id,
                number: 100,
              },
              {
                item: createdProducts[2]._id,
                number: 1,
              },
            ],
            favorites: {
              purchase: {
                item: createdProducts[0]._id,
                number: 2,
              },
            },
          }).save((err, res) => {
            assert(!err, err);
            customerId = res._id;

            new db.models.Invoice({
              customer: res._id,
              amount: 42,
              products: [
                createdProducts[0]._id,
                createdProducts[1]._id,
                createdProducts[2]._id,
              ],
            }).save((err, res) => {
              assert(!err, err);
              invoiceId = res._id;
              done();
            });
          });
        });
      });

      after((done) => {
        db.models.Customer.deleteMany((err) => {
          assert(!err, err);
          db.models.Invoice.deleteMany((err) => {
            assert(!err, err);
            db.models.Product.deleteMany(done);
          });
        });
      });

      it("excludes fields from populated items", (done) => {
        db.models.Invoice.findById(invoiceId)
          .populate("customer")
          .exec((err, invoice) => {
            assert(!err, err);
            invoice = invoiceFilter.filterObject(invoice, {
              populate: [
                {
                  path: "customer",
                },
              ],
            });
            assert.ok(
              invoice.amount === undefined,
              "Invoice amount should be excluded"
            );
            assert.ok(
              invoice.customer.name !== undefined,
              "Customer name should be included"
            );
            assert.ok(
              invoice.customer.address === undefined,
              "Customer address should be excluded"
            );
            done();
          });
      });

      it("iterates through array of populated objects", (done) => {
        db.models.Invoice.findById(invoiceId)
          .populate("products")
          .exec((err, invoice) => {
            assert(!err, err);
            invoice = invoiceFilter.filterObject(invoice, {
              populate: [
                {
                  path: "products",
                },
              ],
            });

            invoice.products.forEach((product) => {
              assert.ok(
                product.name !== undefined,
                "product name should be populated"
              );
              assert.ok(
                product.price === undefined,
                "product price should be excluded"
              );
            });

            done();
          });
      });

      it("filters multiple populated models", (done) => {
        db.models.Invoice.findById(invoiceId)
          .populate("products customer")
          .exec((err, invoice) => {
            assert(!err, err);
            invoice = invoiceFilter.filterObject(invoice, {
              populate: [
                {
                  path: "customer",
                },
                {
                  path: "products",
                },
              ],
            });
            assert.equal(
              invoice.customer.name,
              "John",
              "customer name should be populated"
            );
            assert.ok(
              invoice.customer.address === undefined,
              "customer address should be excluded"
            );

            invoice.products.forEach((product) => {
              assert.ok(
                product.name !== undefined,
                "product name should be populated"
              );
              assert.ok(
                product.price === undefined,
                "product price should be excluded"
              );
            });

            done();
          });
      });

      it.skip("filters nested populated docs", (done) => {
        db.models.Customer.findById(customerId)
          .populate("favorites.purchase.item")
          .exec((err, customer) => {
            assert(!err, err);
            customer = customerFilter.filterObject(customer, {
              populate: [
                {
                  path: "favorites.purchase.item",
                },
              ],
            });

            assert.ok(
              customer.favorites.purchase.item,
              "Purchased item should be included"
            );
            assert.ok(
              customer.favorites.purchase.item.number === undefined,
              "Purchased item number should be excluded"
            );
            assert.ok(
              customer.favorites.purchase.item.name !== undefined,
              "Purchased item name should be included"
            );
            assert.ok(
              customer.favorites.purchase.item.price === undefined,
              "Purchased item price should be excluded"
            );

            done();
          });
      });

      it.skip("filters embedded array of populated docs", (done) => {
        db.models.Customer.findById(customerId)
          .populate("purchases.item")
          .exec((err, customer) => {
            assert(!err, err);
            customer = customerFilter.filterObject(customer, {
              populate: [
                {
                  path: "purchases.item",
                },
              ],
            });

            customer.purchases.forEach((p, i) => {
              assert.ok(
                p.number === undefined,
                "Purchase number should be excluded"
              );
              assert.equal(
                p.item.name,
                products[i].name,
                "Item name should be populated"
              );
              assert.ok(
                p.item.price === undefined,
                "Item price should be excluded"
              );
              assert.ok(p.item.department);
              assert.ok(p.item.department.code === undefined);
            });

            done();
          });
      });
    });
  });

  describe("protected fields", () => {
    it("defaults to not including any", () => {
      invoiceFilter = new Filter({
        model: db.models.Invoice,
        filteredKeys: {
          private: ["amount"],
          protected: ["products"],
        },
      });

      let invoice = {
        customer: "objectid",
        amount: 240,
        products: ["objectid"],
      };

      invoice = invoiceFilter.filterObject(invoice);
      assert.equal(invoice.customer, "objectid");
      assert.ok(invoice.amount === undefined, "Amount should be excluded");
      assert.ok(invoice.products === undefined, "Products should be excluded");
    });

    it("returns protected fields", () => {
      invoiceFilter = new Filter({
        model: db.models.Invoice,
        filteredKeys: {
          private: ["amount"],
          protected: ["products"],
        },
      });

      let invoice = {
        customer: "objectid",
        amount: 240,
        products: ["objectid"],
      };

      invoice = invoiceFilter.filterObject(invoice, {
        access: "protected",
      });

      assert.equal(invoice.customer, "objectid");
      assert.ok(invoice.amount === undefined, "Amount should be excluded");
      assert.equal(
        invoice.products[0],
        "objectid",
        "Products should be included"
      );
    });
  });

  describe("descriminated schemas", () => {
    // we need the accountFilter to be defined since its creation adds
    // an entry in resource_filter's excludedMap
    let accountFilter; // eslint-disable-line no-unused-vars
    let repeatCustFilter;

    before((done) => {
      accountFilter = new Filter({
        model: db.models.Account,
        filteredKeys: {
          private: ["accountNumber"],
        },
      });

      repeatCustFilter = new Filter({
        model: db.models.RepeatCustomer,
      });

      db.models.Account.create(
        {
          accountNumber: "123XYZ",
          points: 244,
        },
        (err, account) => {
          assert(!err, err);
          db.models.RepeatCustomer.create(
            {
              name: "John Smith",
              account: account._id,
            },
            done
          );
        }
      );
    });

    after((done) => {
      db.models.Account.deleteMany(() => {
        db.models.Customer.deleteMany(done);
      });
    });

    it.skip("should filter populated from subschema", (done) => {
      db.models.RepeatCustomer.findOne()
        .populate("account")
        .exec((err, doc) => {
          assert(!err, err);
          let customer = repeatCustFilter.filterObject(doc, {
            populate: [
              {
                path: "account",
              },
            ],
          });
          assert.equal(customer.name, "John Smith");
          assert.equal(customer.account.points, 244);
          assert.ok(
            customer.account.accountNumber === undefined,
            "account number should be excluded"
          );
          done();
        });
    });

    it.skip("should filter populated from base schema", (done) => {
      db.models.Customer.findOne()
        .populate("account")
        .exec((err, doc) => {
          assert(!err, err);
          doc.populate("account", (err, doc) => {
            assert(!err, err);
            let customer = customerFilter.filterObject(doc, {
              populate: [
                {
                  path: "account",
                },
              ],
            });
            assert.equal(customer.name, "John Smith");
            assert.equal(customer.account.points, 244);
            assert.ok(
              customer.account.accountNumber === undefined,
              "account number should be excluded"
            );
            done();
          });
        });
    });
  });
});
