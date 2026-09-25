export type Theme = "light" | "dark";

export const STORAGE_KEY = "theme";

/**
 * Runs inline in <head>, before first paint, so the page never flashes the
 * wrong theme. A saved choice wins; otherwise the system setting decides.
 * Kept as a string because it has to execute before any bundle has loaded.
 *
 * Lives outside the client component on purpose: a value exported from a
 * "use client" module reaches a server component as a client reference, not
 * as the string itself.
 */
export const themeScript = `(function(){try{var t=localStorage.getItem("${STORAGE_KEY}");var d=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light"}catch(e){document.documentElement.dataset.theme="light"}})()`;
