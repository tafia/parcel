# Parcel

I hate JavaScript bundlers.

Don't get me wrong, I love modularizing things, and I love having small files.

What I hate is when I hit <kbd>⌘S</kbd>, <kbd>⌘Tab</kbd>, <kbd>⌘R</kbd>,\* and I, a humble human, beat the super-cool, magical, file-system-watching bundler running on my 2.8 GHz processor. I get the old verson, and I have to wait seconds before I can hit <kbd>⌘R</kbd> again and see my changes.

Parcel is a JavaScript bundler. But I never beat it. Why?

- It doesn't actually parse JavaScript.
- It works almost entirely by concatenation.

It has a few extra rules that let it be really fast:

- You can never name anything `require`.
- You can never use non-constant module names.
- You can never put a `require('…')` call in a string.

(You really shouldn't be doing any of that anyway.)

So don't stand around waiting for your super-cool, magical bundler to do its thing. Use Parcel while you're developing, and iterate to your heart's content. Then use your super-cool, magical, really slow bundler for releases, when you don't care how long it takes to run.

## How do I use it?

Glad you asked! Like this:

```js
// index.js:
const itt = require('itt')
const math = require('./math')
console.log(itt.range(10).map(math.square).join(' '))

// math.js:
exports.square = x => x * x
```

```sh
> npm i -g prcl
> prcl index.js >parcel.js
```

Feel free to `node parcel.js` or `<script src=parcel.js>` at this juncture.

## I want source maps!

Just pass the output filename as an argument instead of redirecting.

```sh
> prcl index.js parcel.js
> ls
... parcel.js parcel.js.map ...
```

## How fast is it?

```sh
> time browserify index.js >browserify.js
real    0m0.225s
user    0m0.197s
sys     0m0.031s
> time prcl index.js >parcel.js
real    0m0.077s
user    0m0.059s
sys     0m0.017s

# on a larger project
> time browserify src/api-download.js >browserify.js
real    0m2.385s
user    0m2.459s
sys     0m0.416s
> time prcl src/api-download.js >parcel.js
real    0m0.204s
user    0m0.187s
sys     0m0.083s

# want source maps?
> time browserify -d src/api-download.js -o bundle.js
real    0m3.142s
user    0m3.060s
sys     0m0.483s
> time prcl src/api-download.js parcel.js
real    0m0.315s
user    0m0.281s
sys     0m0.100s
```

---

\* Or wait for it to hot-swap, or whatever.
