import assert from "assert";
import { Filter } from "../../dist/resource_filter.js";

import setupDb from "../integration/setup.mjs";

describe("resourceFilter", () => {
  describe("filterObject", () => {
    const db = setupDb();

    db.initialize({
      connect: false,
    });

    const filter = new Filter();

    filter.add(db.models.Invoice, {
      filteredKeys: {
        private: [],
        protected: [],
      },
    });

    filter.add(db.models.Customer, {
      filteredKeys: {
        private: ["name"],
        protected: [],
      },
    });

    filter.add(db.models.Product, {
      filteredKeys: {
        private: ["name"],
        protected: [],
      },
    });

    it("removes keys in populated document", () => {
      let invoice = {
        customer: {
          name: "John",
        },
        amount: "42",
      };

      filter.filterObject(invoice, {
        access: "public",
        modelName: db.models.Invoice.modelName,
        populate: [
          {
            path: "customer",
          },
        ],
      });

      assert.deepEqual(invoice, {
        customer: {},
        amount: "42",
      });
    });

    it("removes keys in array with populated document", () => {
      let invoices = [
        {
          customer: {
            name: "John",
          },
          amount: "42",
        },
        {
          customer: {
            name: "Bob",
          },
          amount: "3.14",
        },
      ];

      filter.filterObject(invoices, {
        access: "public",
        modelName: db.models.Invoice.modelName,
        populate: [
          {
            path: "customer",
          },
        ],
      });

      assert.deepEqual(invoices, [
        {
          customer: {},
          amount: "42",
        },
        {
          customer: {},
          amount: "3.14",
        },
      ]);
    });

    it("ignores undefined path", () => {
      let invoice = {
        amount: "42",
      };

      filter.filterObject(invoice, {
        access: "public",
        modelName: db.models.Invoice.modelName,
        populate: [
          {
            path: "customer",
          },
        ],
      });

      assert.deepEqual(invoice, {
        amount: "42",
      });
    });

    it("skip when populate path is undefined", () => {
      let invoice = {
        customer: {
          name: "John",
        },
        amount: "42",
      };

      filter.filterObject(invoice, {
        populate: [{}],
      });

      assert.deepEqual(invoice, {
        customer: {
          name: "John",
        },
        amount: "42",
      });
    });

    it("removes keys in populated document array", () => {
      let invoice = {
        products: [
          {
            name: "Squirt Gun",
          },
          {
            name: "Water Balloons",
          },
        ],
        amount: "42",
      };

      filter.filterObject(invoice, {
        access: "public",
        modelName: db.models.Invoice.modelName,
        populate: [
          {
            path: "products",
          },
        ],
      });

      assert.deepEqual(invoice, {
        products: [{}, {}],
        amount: "42",
      });
    });

    it("removes keys in populated document in array", () => {
      let customer = {
        name: "John",
        purchases: [
          {
            item: {
              name: "Squirt Gun",
            },
          },
        ],
      };

      filter.filterObject(customer, {
        access: "public",
        modelName: db.models.Customer.modelName,
        populate: [
          {
            path: "purchases.item",
          },
        ],
      });

      assert.deepEqual(customer, {
        purchases: [
          {
            item: {},
          },
        ],
      });
    });
  });

  describe("isPathExcluded", () => {
    const filter = new Filter();
    const modelName = "Customer";

    filter.add(
      { modelName },
      {
        filteredKeys: {
          private: ["ssn", "contact.phone", "purchases.number"],
          protected: ["secrets", "contact.email"],
        },
      }
    );

    const isExcluded = (path, access = "public") =>
      filter.isPathExcluded(path, { access, modelName });

    it("excludes an excluded path", () => {
      assert.equal(isExcluded("ssn"), true);
      assert.equal(isExcluded("contact.phone"), true);
    });

    it("excludes a parent of an excluded path", () => {
      assert.equal(isExcluded("contact"), true);
      assert.equal(isExcluded("purchases"), true);
    });

    it("excludes a child of an excluded path", () => {
      assert.equal(isExcluded("secrets.token"), true);
      assert.equal(isExcluded("contact.phone.mobile"), true);
    });

    it("ignores array positions", () => {
      assert.equal(isExcluded("purchases.0.number"), true);
      assert.equal(isExcluded("purchases.0"), true);
    });

    it("does not exclude siblings or paths sharing a prefix", () => {
      assert.equal(isExcluded("contact.name"), false);
      assert.equal(isExcluded("contacts"), false);
      assert.equal(isExcluded("ssnHint"), false);
      assert.equal(isExcluded("purchases.item"), false);
    });

    it("honours access", () => {
      assert.equal(isExcluded("secrets", "protected"), false);
      assert.equal(isExcluded("contact", "protected"), true);
      assert.equal(isExcluded("contact", "private"), false);
      assert.equal(isExcluded("ssn", "private"), false);
    });

    it("does not exclude anything for an unknown model", () => {
      assert.equal(
        filter.isPathExcluded("ssn", { access: "public", modelName: "Nope" }),
        false
      );
    });
  });
});
