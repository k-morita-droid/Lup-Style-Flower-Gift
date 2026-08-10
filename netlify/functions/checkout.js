// Stripe Checkout セッションを作成する Netlify Function
export const handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return { statusCode: 500, body: JSON.stringify({ error: "STRIPE_SECRET_KEY が未設定です" }) };
  let items;
  try {
    items = JSON.parse(event.body || "{}").items;
    if (!Array.isArray(items) || !items.length) throw new Error("no items");
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: "不正なリクエストです" }) };
  }
  const origin = (event.headers && (event.headers.origin || "https://" + event.headers.host)) || "";
  const p = new URLSearchParams();
  p.append("mode", "payment");
  p.append("success_url", origin + "/?payment=success");
  p.append("cancel_url", origin + "/?payment=cancel");
  items.slice(0, 30).forEach((it, i) => {
    const qty = Math.max(1, Math.min(99, parseInt(it.qty, 10) || 1));
    const amount = Math.max(0, Math.min(2000000, parseInt(it.amount, 10) || 0));
    p.append(`line_items[${i}][quantity]`, String(qty));
    p.append(`line_items[${i}][price_data][currency]`, "jpy");
    p.append(`line_items[${i}][price_data][unit_amount]`, String(amount));
    p.append(`line_items[${i}][price_data][product_data][name]`, String(it.name || "商品").slice(0, 120));
  });
  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: "Bearer " + key, "Content-Type": "application/x-www-form-urlencoded" },
    body: p.toString(),
  });
  const data = await res.json();
  if (!res.ok) return { statusCode: 502, body: JSON.stringify({ error: (data.error && data.error.message) || "Stripe エラー" }) };
  return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: data.url }) };
};
