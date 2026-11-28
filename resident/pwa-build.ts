import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import type { Plugin } from 'vite'

export function residentPwa(): Plugin {
  return {
    name: 'resident-offline-shell',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const entry = Object.values(bundle).find(file => file.type === 'chunk' && file.facadeModuleId?.endsWith('/resident/index.html'))
      if (!entry) this.error('Resident entry missing from the Android and iOS installable web build.')
      const assets = new Set<string>()
      function visit(name: string) {
        if (assets.has(name)) return
        assets.add(name)
        const file = bundle[name]
        if (file?.type !== 'chunk') return
        for (const child of [...file.imports, ...file.dynamicImports]) visit(child)
        for (const asset of [...(file.viteMetadata?.importedCss ?? []), ...(file.viteMetadata?.importedAssets ?? [])]) assets.add(asset)
      }
      visit(entry.fileName)
      const paths = ['index.html', 'manifest.webmanifest', ...['icon-192', 'icon-512', 'maskable', 'apple-touch'].map(name => 'icons/' + name + '.png'), ...[...assets].sort().map(name => '../' + name)]
      const worker = readFileSync(new URL('./worker.js', import.meta.url), 'utf8')
      const hash = createHash('sha256').update(JSON.stringify(paths)).update(worker)
      hash.update(readFileSync('resident/index.html'))
      for (const path of paths.filter(p => !p.startsWith('..') && p !== 'index.html')) hash.update(readFileSync('public/resident/' + path))
      this.emitFile({type:'asset',fileName:'resident/sw.js',source:worker.replace('__ASSETS__',JSON.stringify(paths)).replace('__VERSION__',hash.digest('hex').slice(0,16))})
    },
  }
}
