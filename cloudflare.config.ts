import { bindings, defineConfig, defineWorker } from "cf/config";

// Sin cache de respuestas: todas las paginas dependen de la sesion (Supabase) y son dinamicas.
export default defineConfig({
  worker: defineWorker({
    name: "gomeria-cp",
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-11-18",
    assets: {
      htmlHandling: "none",
      notFoundHandling: "none",
      runWorkerFirst: ["/*", "!/_next/static/*", "!/*/_next/static/*"],
    },
    env: {
      ASSETS: bindings.assets(),
    },
  }),
});
