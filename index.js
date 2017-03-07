'use strict'
const path = require('path')
const fs = require('fs')
const {Readable} = require('stream')

module.exports = (file, cb) =>
  fs.realpath(file, (e, file) => e ? cb(e) : new Parcel().bundle(file, cb))

class Parcel {
  constructor() {
    this.files = new Map
    this.mains = new Map
    this.cache = new Map
  }
  bundle(mod, cb) {
    this.resolve(null, mod, (e, file) => e ? cb(e) :
      this.include(file, e => {
        if (e) return cb(e)
        this.main = file
        cb(null, this)
      }))
  }
  dependencies() {return Array.from(this.files.keys())}
  js(end) {
    const js = new Readable
    const it = this.jsGen(end)
    js._read = () => js.push(it.next().value)
    return js
  }
  *jsGen(end) {
    yield JS_START
    for (const [mod, main] of this.mains) {
      yield `\n  mains.set(${this.jsPath(mod)}, ${this.jsPath(main)})`
    }
    for (const [file, source] of this.files) {
      yield `\n  fns.set(${this.jsPath(file)}, function(module, exports, require) {\n`
      yield source
      yield `})`
    }
    yield `\n  return makeRequire(null)(${this.jsPath(this.main)})`
    yield JS_END
    if (end) yield end
    yield null
  }
  map() {
    const sourceRoot = path.dirname(this.main)
    const map = {
      version: 3,
      file: '',
      sourceRoot: '',
      sources: Array.from(this.files.keys())
        .map(f => path.relative(sourceRoot, f)),
      sourcesContent: Array.from(this.files.values()),
      names: [],
    }
    const prefix = lines(JS_START) + this.mains.size
    const mappings = Array(prefix)
    let index = null
    let line = 0
    for (const [file, source] of this.files) {
      mappings.push(undefined)
      let first = true
      for (let i = lines(source); i--;) {
        mappings.push('A' + (first ? (index == null ? 'AAA' : 'C' + vlq(-line) + 'A') : 'ACA'))
        if (first) line = 0
        else ++line
        first = false
      }
      ++index
    }
    mappings.push('ACAA')
    map.mappings = mappings.join(';')
    return JSON.stringify(map)
  }
  jsPath(p) {
    return JSON.stringify(p[0] === '/' ? p : '/' + p.replace(/\\/g, '/'))
  }
  require(parent, name, cb) {
    this.resolve(parent, name, (e, file) => e ? cb(e) : this.include(file, cb))
  }
  include(file, cb) {
    if (!file || this.files.has(file)) return process.nextTick(cb)
    fs.readFile(file, {encoding: 'utf8'}, (e, js) => {
      if (e) return cb(e)
      if (js[0] === '#' && js[1] === '!') {
        js = '//' + js.slice(2)
      }
      this.files.set(file, js)
      const deps = new Set
      let x
      while (x = REQUIRE_RE.exec(js)) {
        deps.add(JSON.parse('"' + (x[1] || x[2] || '') + '"'))
      }
      map(deps, (d, cb) => this.resolve(file, d, cb), (e, deps) => {
        if (e) return cb(e)
        const files = new Set(deps.filter(x => x))
        map(files, (f, cb) => this.include(f, cb), e => cb(e))
      })
    })
  }
  resolve(parent, name, cb) {
    const nope = () =>
      cb(new Error(`Could not resolve module name: ${name} in ${parent}`))
    if (name[0] === '.' || name[0] === '/') {
      const p = name[0] === '.' ? path.resolve(parent, '..', name) : name
      this.resolvePathOrModule(p, (e, file) => e ? nope() : cb(null, file))
    } else if (parent) {
      if (CORE_MODULES.has(name)) return process.nextTick(cb, null, null)
      let p = parent
      const next = () => {
        const n = path.dirname(p)
        if (n === p) return nope()
        p = n
        if (path.basename(p) === 'node_modules') return next()
        const k = path.join(p, 'node_modules', name)
        this.resolvePathOrModule(k, (e, file) => e ? next() : cb(null, file))
      }
      process.nextTick(next)
    } else process.nextTick(cb, new Error('Main module must be a file path'))
  }
  resolvePathOrModule(base, cb) {
    const m = this.mains.get(base)
    if (m) return cb(null, m)
    const pkg = path.join(base, 'package.json')
    fs.readFile(pkg, (e, j) => {
      if (j) {
        const main = JSON.parse(j).main
        if (main) {
          const real = path.resolve(base, main)
          return this.resolvePath(real, (e, file) => {
            if (e) return cb(new Error)
            this.mains.set(base, file)
            cb(null, file)
          })
        }
      }
      this.resolvePath(base, cb)
    })
  }
  resolvePath(base, cb) {
    const indexJS = path.join(base, 'index.js')
    const indexJSON = path.join(base, 'index.json')
    this.exists(base, t => t ? cb(null, base) :
    this.exists(base+'.js', t => t ? cb(null, base+'.js') :
    this.exists(indexJS, t => t ? cb(null, indexJS) :
    this.exists(base+'.json', t => t ? cb(null, base+'.json') :
    this.exists(indexJSON, t => t ? cb(null, indexJSON) :
    cb(new Error))))))
  }
  exists(file, cb) {
    const t = this.cache.get(file)
    if (t != null) return process.nextTick(cb, t)
    fs.stat(file, (e, s) => {
      const t = !e && s.isFile()
      this.cache.set(file, t)
      cb(t)
    })
  }
}

const REQUIRE_RE = /\brequire\s*\(\s*(?:'((?:[^'\n]+|\\[^])*)'|"((?:[^"\n]+|\\[^])*)")\s*\)/g

const CORE_MODULES = new Set(['assert', 'buffer', 'child_process', 'cluster', 'crypto', 'dgram', 'dns', 'domain', 'events', 'fs', 'http', 'https', 'net', 'os', 'path', 'punycode', 'querystring', 'readline', 'stream', 'string_decoder', 'tls', 'tty', 'url', 'util', 'v8', 'vm', 'zlib'])

const JS_START = '~' + function(baseRequire, core) {
  if (!baseRequire) baseRequire = () => {
    throw new Error(`Could not resolve module name: ${n}`)
  }
  const modules = new Map
  const fns = new Map
  const mains = new Map
  const stack = []
  const dirname = file => {
    file = file.split('/')
    file.shift()
    file.pop()
    return '/' + file.join('/')
  }
  const resolve = (base, then) => {
    base = base.split('/')
    base.shift()
    for (const p of then.split('/')) {
      if (p === '..') base.pop()
      else if (p !== '.') base.push(p)
    }
    return '/' + base.join('/')
  }
  const makeRequire = self => {
    const parts = self ? self.filename.split('/') : []
    parts.shift()
    const require = m => {
      if (core.has(m)) return baseRequire(m)
      const filename = require.resolve(m)
      const o = modules.get(filename)
      if (o) return o.exports
      const module = {
        filename,
        id: filename,
        loaded: false,
        parent: self,
        children: [],
        exports: {},
      }
      module.require = makeRequire(module)
      module.require.main = self ? self.require.main : module
      modules.set(filename, module)
      fns.get(filename)(module, module.exports, module.require)
      module.loaded = true
      return module.exports
    }
    require.main = self
    require.resolve = n => {
      if (n[0] === '.' || n[0] === '/') {
        const p = resolvePath(n[0] === '.' ? resolve(self.filename, '../'+n) : n)
        if (p) return p
      } else {
        const p = parts.slice()
        while (p.length) {
          p.pop()
          if (p[p.length - 1] === 'node_modules') continue
          const r = resolvePath('/' + p.join('/') + '/node_modules/' + n)
          if (r) return r
        }
      }
      throw new Error(`Could not resolve module name: ${n}`)
    }
    const resolvePath = b => {
      const m = mains.get(b)
      if (m) return m
      if (fns.has(b+'/index.js')) return b+'/index.js'
      if (fns.has(b+'/index.json')) return b+'/index.json'
      if (fns.has(b)) return b
      if (fns.has(b+'.js')) return b+'.js'
      if (fns.has(b+'.json')) return b+'.json'
    }
    return require
  }
}.toString().slice(0, -1)
const JS_END = '\n}.call(this, typeof require === "undefined" ? null : require, new Set('+JSON.stringify(Array.from(CORE_MODULES))+'))\n'

function map(it, fn, cb) {
  let i = 0, done = 0, err = false
  const result = []
  for (const x of it) {
    const k = i++
    fn(x, (e, y) => {
      if (err) return
      if (e) return err = true, cb(e)
      result[k] = y
      if (++done === length) return cb(null, result)
    })
  }
  const length = i
  if (!length) process.nextTick(cb, null, result)
}
function lines(s) {
  const m = s.match(LINE_RE)
  return m ? m.length + 1 : 1
}
const LINE_RE = /\r?\n/g

function vlq(n) {
  const sign = n < 0
  if (sign) n = -n
  let y = (n & 0xf) << 1 | sign
  let r = n >> 5
  let s = ''
  while (r) {
    y |= 0x20
    s += B64[y]
    y = r & 0x1f
    r >>= 5
  }
  return s + B64[y]
}
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="
