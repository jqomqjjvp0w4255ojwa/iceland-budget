const API_BASE = "https://script.google.com/macros/s/AKfycbzdizbJL4rRrHaeVNWFqp4mZiJ8BXJdE0wO7beJTIjyLgy4Nmzv9vDGmjRNi5TLgWg0/exec";

const SHEET_MAP = {
  overview: "總覽",
  accommodation: "住宿",
  car: "租車",
  activity: "活動",
  "總覽": "總覽",
  "住宿": "住宿",
  "租車": "租車",
  "活動": "活動",
};

exports.handler = async function (event) {
  const key = event.queryStringParameters?.sheet || "overview";
  const sheet = SHEET_MAP[key];

  if (!sheet) {
    return json(400, {
      error: "Unknown sheet",
      available: Object.keys(SHEET_MAP),
    });
  }

  try {
    const url =
      sheet === "總覽"
        ? API_BASE
        : `${API_BASE}?sheet=${encodeURIComponent(sheet)}`;

    const res = await fetch(url, {
      redirect: "follow",
      headers: { "user-agent": "iceland-budget-netlify" },
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
