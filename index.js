var types = {
  'hidden': './lib/hidden.js',
  'public': './lib/public.js'
};

module.exports = function (type) {
  if (!types[type]) throw new Error('type must be "hidden" or "public"');
  return require(types[type]);
}
