var c = {};

var cache = module.exports = function (k, v) {
  if (v) {
    c[k] = v;
  } else return c[k];
};

cache.lazy = function (k) { return function () { return cache(k); }};
