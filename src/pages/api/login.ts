import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const data = await request.formData();
  const password = String(data.get("password") || "");

  if (!import.meta.env.APP_PASSWORD || password !== import.meta.env.APP_PASSWORD) {
    return redirect("/login?error=1");
  }

  cookies.set("dinar_session", import.meta.env.APP_SESSION_TOKEN, {
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });

  return redirect("/");
};
