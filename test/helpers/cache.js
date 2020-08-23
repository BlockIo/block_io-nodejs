const c = {};
const l = {};

const cache = function (k, v) {
  if (v) {
    c[k] = v;
    if (l[k]) l[k].forEach(fn => fn(v));
  } else return c[k];
};

cache.lazy = function (k) { return function () { return cache(k); }}
cache.on = function (k, fn) { if (!l[k]) l[k] = []; l[k].push(fn); if (c[k]) fn(c[k]); }

cache.require = function (keys, fn) {

  const _wrapper = function () {
    if (keys.some(k => !Object.prototype.hasOwnProperty.call(c, k))) return;
    fn(keys.map(k => c[k]));
  }

  keys.forEach(k => cache.on(k, _wrapper));
}

module.exports = cache;
