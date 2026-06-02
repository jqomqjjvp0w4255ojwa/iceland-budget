const API_BASE = "https://script.google.com/macros/s/AKfycbzdizbJL4rRrHaeVNWFqp4mZiJ8BXJdE0wO7beJTIjyLgy4Nmzv9vDGmjRNi5TLgWg0/exec";

const ALLOWED_SHEETS = new Set(["總覽", "住宿", "租車", "活動"]);

exports.handler = async function (event) {
  const sheet = event.queryStringParameters?.sheet || "總覽";

  if (!ALLOWED_SHEETS.has(sheet)) {
    return json(400, {
      error: "Unknown sheet",
      available: [...ALLOWED_SHEETS],
    });
  }

  try {
    const url =
      sheet === "總覽"
        ? API_BASE
        : `${API_BASE}?sheet=${encodeURIComponent(sheet)}`;

    const res = await fetch(url, {
      redirect: "follow",
      headers: {
        "user-agent": "iceland-budget-netlify",
      },
    });

    const text = await res.text();

    if (!res.ok) {
      return json(res.status, {
        error: "Apps Script request failed",
        status: res.status,
        body: text.slice(0, 800),
      });
    }

    return {
      statusCode: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
        "access-control-allow-origin": "*",
      },
      body: text,
    };
  } catch (error) {
    return json(500, {
      error: "Failed to fetch sheet data",
      message: error.message,
    });
  }
};

function json(statusCode, data) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
    },
    body: JSON.stringify(data, null, 2),
  };
}
