# Parcel

So I hate JavaScript bundlers.

Don't get me wrong, I love modularizing things, and I love having small files.

What I hate is when I hit ⌘S, ⌘Tab, ⌘R\*, and I, a humble human, beat the super cool magic file system watching bundler. I get the old verson, and I have to wait a second and hit ⌘R again before I can see my changes.

Parcel is a bundler. But I never beat it. Why?

- It doesn't actually parse JavaScript.
- It works almost entirely by concatenation.

So use Parcel while you're developing, and then use your super cool magic (but really slow) bundler for releases.

## How do I use it?

Glad you asked! Like this:

```js
index.js:
'use strict'
const itt = require('itt')
const math = require('./math')

console.log(itt.range(10).map(math.square).join(' '))

math.js:
'use strict'

exports.square = x => x * x
```

```sh
> parcel index.js >parcel.js
```

## Huh?

That's right, it looks and works just like every other node-style `require()` bundler. But it has a few extra rules that let it be really fast:

- You can never name anything 'require'.
- You can never use non-constant module names.
- You can never put a `require('…')` call in a string.

## How fast?

```sh
> time browserify index.js >browserify.js

real    0m0.225s
user    0m0.197s
sys 0m0.031s
> time parcel index.js >parcel.js

real    0m0.077s
user    0m0.059s
sys 0m0.017s

# on a larger project
> time browserify src/api-download.js >browserify.js

real    0m2.385s
user    0m2.459s
sys 0m0.416s
> time parcel src/api-download.js >parcel.js

real    0m0.204s
user    0m0.187s
sys 0m0.083s
```

---

\* Or wait for it to hot-swap, or whatever.
