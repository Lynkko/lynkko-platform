import { copyFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const src  = join(__dirname, '../src/styles.css')
const dest = join(__dirname, '../dist/styles.css')

mkdirSync(join(__dirname, '../dist'), { recursive: true })
copyFileSync(src, dest)
console.log('CSS tokens copied to dist/styles.css')
