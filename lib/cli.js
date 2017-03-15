#!/usr/bin/env node
'use strict'
const fs = require('fs')
const path = require('path')
const prcl = require('..')

function arg(k) {
  const isIn = k === '-i' || k === '--input'
  if (isIn || k === '-o' || k === '--output') {
    if (isIn ? input : output) {
      console.error(`${name()}: only one ${isIn ? 'input' : 'output'} is allowed`)
      process.exit(1)
    }
    const a = process.argv[i++]
    if (isIn) input = a
    else output = a
  } else if (k === '-w' || k === '--watch') {
    watch = true
  } else if (!input) {
    input = k
  } else if (!output) {
    output = k
  } else {
    console.error(`${name()}: too many arguments`)
    process.exit(1)
  }
}
const name = () => path.basename(process.argv[1])

const generate = (input, output, cb) =>
  prcl(input, (e, r) => {
    if (e) return cb(e)
    if (!output) return r.js()
      .on('error', e => cb(e))
      .on('end', () => cb(null, r))
      .pipe(process.stdout)
    const suffix = `//# sourceMappingURL=${output}.map\n`
    return r.js(suffix)
      .pipe(fs.createWriteStream(output))
      .on('error', e => cb(e))
      .on('finish', () =>
        fs.writeFile(output+'.map', r.map(suffix), e => cb(e, r)))
  })

function startWatching(r) {
  const watchers = new Map
  const updateDeps = deps => {
    const removed = new Set(watchers.keys())
    for (const d of deps) {
      removed.delete(d)
      if (!watchers.has(d)) {
        watchers.set(d, fs.watch(d, throttle))
      }
    }
    for (const r of removed) {
      watchers.get(r).close()
      watchers.delete(r)
    }
  }
  let timeout
  const throttle = () => {
    clearTimeout(timeout)
    timeout = setTimeout(update, 5)
  }
  const update = (...args) => {
    const start = process.hrtime()
    generate(input, output, (e, r) => {
      if (e) {
        console.error(e.stack)
        process.exit(1)
      }
      const [s, ns] = process.hrtime(start)
      const ms = s * 1e3 + ns / 1e6
      console.error(`generate ${output} in ${ms} ms`)
      updateDeps(r.dependencies())
    })
  }
  updateDeps(r.dependencies())
  console.error('ready')
}

let input, output, watch = false, help = false, i = 2
const l = process.argv.length
while (i < l && !help) {
  const a = process.argv[i++]
  if (a[0] === '-' && a[1] !== '-') {
    for (let i = 1; i < a.length; ++i) arg('-' + a[i])
  } else {
    arg(a)
  }
}
if (help || !input) {
  console.error(`usage: ${name()} [options] <input> [output]

options:
  -i, --input <input>    use <input> as the main module
  -o, --output <output>  output bundle to <output> and
                         source map to <output>.map
  -w, --watch            watch for changes
`)
  process.exit(1)
}
generate(input, output, (e, r) => {
  if (!e) return watch && startWatching(r)
  console.error(e.stack)
  process.exit(1)
})
