import packageJson from './package.json'
import tailwindcss from "@tailwindcss/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      clientVersion: packageJson.version
    }
  },
  app: {
    head: {
      title: 'Grafana Loki Viewer'
    }
  },
  compatibilityDate: '2024-04-03',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  vite: {
    plugins: [
      tailwindcss(),
    ],
  },

  modules: ["@nuxt/icon"]
})