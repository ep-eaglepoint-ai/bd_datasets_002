function createScale() {
  const fn = (value) => value
  fn.domain = () => fn
  fn.range = () => fn
  fn.clamp = () => fn
  return fn
}

module.exports = {
  scaleLinear: createScale,
  interpolateRdYlGn: () => '#000000',
}
