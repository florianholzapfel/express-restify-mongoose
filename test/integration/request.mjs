// Minimal stand-in for the deprecated `request` package, built on the global
// fetch API. It covers only the subset the integration tests use:
//   request(opts, cb), request.get/post/put/patch/del(opts, cb)
//   opts: { method, url, qs, json, formData }
//   cb(err, res, body) with res.statusCode and res.headers (lower-cased)

function appendQs(params, key, value) {
  if (value === undefined) {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((v, i) => appendQs(params, `${key}[${i}]`, v));
  } else if (value !== null && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      appendQs(params, `${key}[${k}]`, v);
    }
  } else {
    params.append(key, value === null ? "" : String(value));
  }
}

function buildUrl(url, qs) {
  if (!qs) {
    return url;
  }

  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(qs)) {
    appendQs(params, key, value);
  }

  const query = params.toString();

  if (!query) {
    return url;
  }

  return `${url}${url.includes("?") ? "&" : "?"}${query}`;
}

async function send(opts) {
  const method = (opts.method || "GET").toUpperCase();
  const headers = {};
  let body;

  if (opts.json) {
    headers.accept = "application/json";
  }

  if (opts.json && typeof opts.json === "object") {
    headers["content-type"] = "application/json";
    body = JSON.stringify(opts.json);
  } else if (opts.formData) {
    body = new FormData();

    for (const [key, value] of Object.entries(opts.formData)) {
      body.append(key, value);
    }
  }

  const response = await fetch(buildUrl(opts.url, opts.qs), {
    method,
    headers,
    body,
  });

  const text = await response.text();
  let parsed = text;

  if (opts.json) {
    if (text === "") {
      parsed = undefined;
    } else {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }
    }
  }

  const res = {
    statusCode: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body: parsed,
  };

  return [res, parsed];
}

function request(opts, callback) {
  // Invoke the callback outside the promise chain so a failing assertion
  // surfaces as an uncaught exception (which mocha attributes to the test),
  // exactly like it did with `request`.
  send(opts).then(
    ([res, body]) => setImmediate(() => callback(null, res, body)),
    (err) => setImmediate(() => callback(err))
  );
}

for (const [name, method] of Object.entries({
  get: "GET",
  post: "POST",
  put: "PUT",
  patch: "PATCH",
  del: "DELETE",
})) {
  request[name] = (opts, callback) => request({ ...opts, method }, callback);
}

export default request;
