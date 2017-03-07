const fsbx = require('fuse-box')

new fsbx.FuseBox({
  homeDir: '.',
  outFile: 'index.fusebox.js',
  log: false,
}).bundle('index.js')
