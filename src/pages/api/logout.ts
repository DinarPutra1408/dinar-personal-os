import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ cookies, redirect }) => {
  cookies.delete("dinar_session", { path: "/" });
  return redirect("/login");
};
