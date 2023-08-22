import fs from 'fs'
import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { defineConfig } from 'vite'

import microLc from './plugins/vite-plugin-micro-lc'

const getVersion = async () =>
  fs.promises.readFile('../../package.json', {encoding: 'utf-8'})
    .then(JSON.parse)
    .then((pkg: {version: string}) => pkg.version)

// https://vitejs.dev/config/
export default defineConfig(async ({mode}) => ({
  base: mode === 'production' ? `/micro-lc/examples/${await getVersion()}/static/parcels/vue/` : '/applications/vue/',
  build: {
    minify: false,
    outDir: 'build',
  },
  plugins: [
    vue(),
    vueJsx(),
    microLc('vue3'),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
}))
