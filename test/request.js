import fetch from "node-fetch";

// type RequestOptions = {
//   method: "DELETE" | "GET" | "PATCH" | "POST" | "PUT";
//   url: string;
//   formData?: unknown;
//   json?: boolean | Record<string, unknown>;
//   qs?: Record<string, string>;
// };

async function request({ url, method, formData, json, qs }, callback) {
  const response = await fetch(
    qs ? `${url}?${new URLSearchParams(qs).toString()}` : url,
    {
      method,
      headers: {
        ...(formData
          ? { "Content-Type": "application/x-www-form-urlencoded" }
          : undefined),
        ...(json ? { "Content-Type": "application/json" } : undefined),
      },
      body: JSON.stringify(json),
    }
  );

  switch (response.headers["Content-Type"]) {
    case json: {
      callback(!response.ok, response, await response.json());

      break;
    }
    default: {
      callback(!response.ok, response);

      break;
    }
  }
}

export const del = function getRequest(requestOptions) {
  return request({
    method: "DELETE",
    ...requestOptions,
  });
};

export const get = function getRequest(requestOptions) {
  return request({
    method: "GET",
    ...requestOptions,
  });
};

export const patch = function getRequest(requestOptions) {
  return request({
    method: "PATCH",
    ...requestOptions,
  });
};

export const post = function getRequest(requestOptions) {
  return request({
    method: "POST",
    ...requestOptions,
  });
};

export const put = function getRequest(requestOptions) {
  return request({
    method: "PUT",
    ...requestOptions,
  });
};
