import * as esbuild from 'esbuild'
import { join }     from 'path'
import concat       from 'concat'

import { cpSync, readdirSync } from 'fs'

/**
 * Builds the JavaScript files.
 */
export async function build_js() {
  await esbuild.build({
    entryPoints : ['src/main.tsx'],
    bundle      : true,
    outfile     : 'dist/main.js',
    format      : 'esm',
    target      : 'esnext',
    sourcemap   : true,
  })

  await esbuild.build({
    entryPoints : ['src/sw.ts'],
    bundle      : true,
    outfile     : 'dist/sw.js',
    format      : 'iife',
    target      : 'esnext',
    sourcemap   : true,
  })
}

export async function build_css() {
  const styles_path = 'src/styles'
  const css_list    = readdirSync(styles_path)
    .filter(file => file.endsWith('.css'))
    .map(file => join(styles_path, file))
  // Ensure global.css comes first
  const global_path = join(styles_path, 'global.css')
  const css_files = [
    global_path,
    ...css_list.filter(file => file !== global_path)
  ]
  await concat(css_files, 'dist/styles.css')
}

export function copy_assets() {
  cpSync('src/index.html', 'dist/index.html')
  cpSync('public', 'dist', { recursive: true })
}

export async function watch_js() {
  const main_context = await esbuild.context({
    entryPoints : ['src/main.tsx'],
    bundle      : true,
    outfile     : 'dist/main.js',
    format      : 'esm',
    target      : 'esnext',
    sourcemap   : true,
  })

  const sw_context = await esbuild.context({
    entryPoints : ['src/sw.ts'],
    bundle      : true,
    outfile     : 'dist/sw.js',
    format      : 'iife',
    target      : 'esnext',
    sourcemap: true,
  })

  await main_context.watch()
  await sw_context.watch()

  return () => {
    main_context.dispose()
    sw_context.dispose()
  }
}