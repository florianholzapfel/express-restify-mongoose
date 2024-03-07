import restify from "restify";

import accessTests from "./integration/access.mjs";
import contextFilterTests from "./integration/contextFilter.mjs";
import createTests from "./integration/create.mjs";
import deleteTests from "./integration/delete.mjs";
import hookTests from "./integration/hooks.mjs";
import middlewareTests from "./integration/middleware.mjs";
import optionsTests from "./integration/options.mjs";
import readTests from "./integration/read.mjs";
import updateTests from "./integration/update.mjs";
import virtualsTests from "./integration/virtuals.mjs";

import setupDb from "./integration/setup.mjs";

const db = setupDb();

function Restify() {
  let app = restify.createServer();
  app.use(restify.plugins.queryParser());
  app.use(restify.plugins.bodyParser());
  app.isRestify = true;
  return app;
}

function setup(callback) {
  db.initialize((err) => {
    if (err) {
      return callback(err);
    }

    db.reset(callback);
  });
}

function dismantle(app, server, callback) {
  db.close((err) => {
    if (err) {
      return callback(err);
    }

    if (app.close) {
      return app.close(callback);
    }

    server.close(callback);
  });
}

function runTests(createFn) {
  describe(createFn.name, () => {
    createTests(createFn, setup, dismantle);
    readTests(createFn, setup, dismantle);
    updateTests(createFn, setup, dismantle);
    deleteTests(createFn, setup, dismantle);
    accessTests(createFn, setup, dismantle);
    contextFilterTests(createFn, setup, dismantle);
    hookTests(createFn, setup, dismantle);
    middlewareTests(createFn, setup, dismantle);
    optionsTests(createFn, setup, dismantle);
    virtualsTests(createFn, setup, dismantle);
  });
}

runTests(Restify);
