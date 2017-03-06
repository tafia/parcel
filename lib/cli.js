#!/usr/bin/env node
'use strict'

// const [s, ns] = process.hrtime()
require('..')(process.argv[2], (e, source) => {
  if (e) return console.error(e.stack)
  // const [s2, ns2] = process.hrtime()
  console.log(source)
  // console.error(`generated in ${(s2 - s) * 1e3 + (ns2 - ns) / 1e6} ms`)
})
