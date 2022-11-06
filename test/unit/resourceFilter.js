// @ts-check
import assert from "assert";
import { Filter } from "../../src/resource_filter";

import setupDb from "../integration/setup";

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
});
