/**
 * Core responsibility: syntax-check every runtime JavaScript file of the plugin
 * with the running Node executable.
 * Contracts: reads the repository layout from the working directory; exits with
 * a non-zero code and prints the first diagnostic per failing file.
 * Constraints: performs no installation, no network access, and no file writes.
 */
import { execFileSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'

const files = ['index.js', 'client.js']
for (const name of readdirSync('host')) {
  if (name.endsWith('.js')) files.push(join('host', name))
}

let failed = false
for (const file of files) {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' })
  } catch (error) {
    failed = true
    const output = error && error.stderr ? String(error.stderr) : String(error)
    process.stderr.write(`syntax error in ${file}\n${output}\n`)
  }
}

if (failed) process.exit(1)
console.log(`syntax OK (${files.length} files)`)
