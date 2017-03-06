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
  prcl(input, (e, r) =>
    e ? cb(e) :
    !output ? console.log(r.js()) :
    fs.writeFile(output, r.js() + '//# sourceMappingURL='+output+'.map\n', e =>
      e ? cb(e) : fs.writeFile(output+'.map', r.map(), cb)))

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
generate(input, output, e => {
  if (!e) return
  console.error(e.stack)
  process.exit(1)
})
