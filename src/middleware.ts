import { defineMiddleware } from "astro:middleware";

const PUBLIC_PATHS = [
  "/login",
  "/api/login",
  "/manifest.webmanifest",
  "/service-worker.js",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

export const onRequest = defineMiddleware(async (context, next) => {
  const path = context.url.pathname;
  if (PUBLIC_PATHS.includes(path) || path.startsWith("/_astro/")) return next();

  const expected = import.meta.env.APP_SESSION_TOKEN;
  const current = context.cookies.get("dinar_session")?.value;

  if (!expected || current !== expected) {
    return context.redirect("/login");
  }

  return next();
});
