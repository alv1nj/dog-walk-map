// 遛狗吧云同步 API — Cloudflare Pages Functions + KV
// GET  /api/sync/:code  读取该同步码下的数据
// PUT  /api/sync/:code  写入（客户端已做双向合并）

const CODE_RE = /^[a-z0-9-]{6,40}$/;
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });

export async function onRequestGet({ params, env }) {
  const code = String(params.code || "").toLowerCase();
  if (!CODE_RE.test(code)) return json({ error: "bad_code" }, 400);
  const v = await env.LGB_KV.get("sync:" + code);
  if (!v) return json({ error: "not_found" }, 404);
  return new Response(v, { headers: { "Content-Type": "application/json" } });
}

export async function onRequestPut({ request, params, env }) {
  const code = String(params.code || "").toLowerCase();
  if (!CODE_RE.test(code)) return json({ error: "bad_code" }, 400);
  const body = await request.text();
  if (body.length > 3_000_000) return json({ error: "too_large" }, 413);
  try { JSON.parse(body); } catch { return json({ error: "bad_json" }, 400); }
  await env.LGB_KV.put("sync:" + code, body);
  return json({ ok: true });
}
