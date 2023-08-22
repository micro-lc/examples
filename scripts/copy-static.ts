import { resolve } from 'path'

import { copy, statSync, mkdirpSync } from 'fs-extra'
import { globSync } from 'glob'

const APPLICATION_GLOB = 'parcels/*'

async function copyStaticFiles(): Promise<void> {
  const subapplications = globSync(APPLICATION_GLOB)
    .map((path) => ({
      dest: resolve(__dirname, '..', 'static', path),
      name: path.replace('parcels/', ''),
      src: resolve(__dirname, '..', path, 'build'),
    }))
    .filter(({ src }) => statSync(src).isDirectory())

  mkdirpSync(resolve(__dirname, '..', 'static'))

  const promises = subapplications.map(({ src, dest, name }) =>
    copy(src, dest, { overwrite: true }).then(() => { console.log(`[${name}]: static files copied`) })
  )

  return Promise.all(promises).then(() => { /* noop */ })
}

copyStaticFiles()
  .catch(console.error)

