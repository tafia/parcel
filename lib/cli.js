#!/usr/bin/env node
'use strict'
const fs = require('fs')
const prcl = require('..')

const generate = (input, output, cb) =>
  prcl(input, (e, r) =>
    e ? cb(e) :
    !output ? console.log(r.js()) :
    fs.writeFile(output, r.js() + '//# sourceMappingURL='+output+'.map\n', e =>
      e ? cb(e) : fs.writeFile(output+'.map', r.map(), cb)))

generate(process.argv[2], process.argv[3], e => e && console.error(e.stack))
