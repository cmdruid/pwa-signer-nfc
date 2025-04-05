import { build_js, build_css, copy_assets } from './utils';

/**
 * Production build script.
 */
async function build() {
  try {
    await build_js()
    await build_css()
    copy_assets()
    console.log('Build completed successfully')
  } catch (error) {
    console.error('Build failed:', error)
    process.exit(1)
  }
}

build()
