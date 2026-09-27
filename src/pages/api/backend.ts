import type { APIRoute } from "astro";

function cfg() {
  const url = import.meta.env.APPS_SCRIPT_URL;
  const token = import.meta.env.APPS_SCRIPT_TOKEN;
  if (!url || !token) throw new Error("APPS_SCRIPT_URL / APPS_SCRIPT_TOKEN belum diisi.");
  return { url, token };
}

export const GET: APIRoute = async ({ url }) => {
  try {
    const c = cfg();
    const target = new URL(c.url);
    url.searchParams.forEach((value, key) => target.searchParams.set(key, value));
    target.searchParams.set("token", c.token);

    const response = await fetch(target.toString(), { redirect: "follow" });
    const text = await response.text();

    return new Response(text, {
      status: response.ok ? 200 : 502,
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  } catch (error: any) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const c = cfg();
    const body = await request.json();

    const response = await fetch(c.url, {
      method: "POST",
      redirect: "follow",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ ...body, token: c.token })
    });

    const text = await response.text();

    return new Response(text, {
      status: response.ok ? 200 : 502,
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  } catch (error: any) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
};
