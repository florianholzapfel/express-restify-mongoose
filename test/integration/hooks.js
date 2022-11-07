import assert from "assert";
import request from "request";
import { serve } from "../../src/express-restify-mongoose";

import setupDb from "./setup";

module.exports = function (createFn, setup, dismantle) {
  const db = setupDb();

  let testPort = 30023;
  let testUrl = `http://localhost:${testPort}`;

  describe("Mongoose hooks", () => {
    let app = createFn();
    let server;

    before((done) => {
      setup((err) => {
        if (err) {
          return done(err);
        }

        serve(app, db.models.Hook, {
          restify: app.isRestify,
        });

        server = app.listen(testPort, done);
      });
    });

    after((done) => {
      dismantle(app, server, done);
    });

    it("POST /Hook 201", (done) => {
      request.post(
        {
          url: `${testUrl}/api/v1/Hook`,
          json: {
            preSaveError: false,
            postSaveError: false,
          },
        },
        (err, res, body) => {
          assert.ok(!err);
          assert.equal(res.statusCode, 201);
          assert.ok(body._id);
          assert.equal(body.preSaveError, false);
          assert.equal(body.postSaveError, false);
          done();
        }
      );
    });

    it("POST /Hook 400", (done) => {
      request.post(
        {
          url: `${testUrl}/api/v1/Hook`,
          json: {
            preSaveError: true,
            postSaveError: false,
          },
        },
        (err, res, body) => {
          assert.ok(!err);
          assert.equal(res.statusCode, 400);
          assert.deepEqual(body, {
            name: "Error",
            message: "AsyncPreSaveError",
          });
          done();
        }
      );
    });

    it("POST /Hook 400", (done) => {
      request.post(
        {
          url: `${testUrl}/api/v1/Hook`,
          json: {
            preSaveError: false,
            postSaveError: true,
          },
        },
        (err, res, body) => {
          assert.ok(!err);
          assert.equal(res.statusCode, 400);
          assert.deepEqual(body, {
            name: "Error",
            message: "AsyncPostSaveError",
          });
          done();
        }
      );
    });
  });
};
