import fs from "fs";

const raw = fs.readFileSync(".env.local", "utf8");
const env = {};
for (const line of raw.split(/\r?\n/)) {
  if (!line || line.startsWith("#")) continue;
  const i = line.indexOf("=");
  if (i === -1) continue;
  env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
}

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("missing url/key");
  process.exit(1);
}

const headers = { apikey: key, Authorization: `Bearer ${key}` };

async function main() {
  // OpenAPI schema
  try {
    const r = await fetch(`${url}/rest/v1/`, { headers: { ...headers, Accept: "application/openapi+json" } });
    const ct = r.headers.get("content-type") || "";
    console.log("openapi_status", r.status, ct);
    if (r.ok && ct.includes("json")) {
      const j = await r.json();
      const defs = j.definitions || j.components?.schemas || {};
      console.log("tables", Object.keys(defs).sort());
      for (const [name, def] of Object.entries(defs)) {
        if (!name || name.startsWith("rpc")) continue;
        const props = def.properties || {};
        console.log(`\nTABLE ${name}`);
        console.log(Object.keys(props).sort().join(","));
      }
    } else {
      console.log(await r.text().then(t=>t.slice(0,300)));
    }
  } catch (e) {
    console.log("openapi_error", e.message);
  }

  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(url, key);
  const tables = ["animes","episodes","watchlists","historial","sesiones","profiles"];
  for (const t of tables) {
    const { data, error, count } = await sb.from(t).select("*", { count: "exact" }).limit(1);
    console.log(`\nSAMPLE ${t} status=${error ? "err:"+error.message : "ok"} count=${count} cols=${data && data[0] ? Object.keys(data[0]).join(",") : "(no rows)"}`);
  }
}
main().catch(e => { console.error(e); process.exit(1); });
