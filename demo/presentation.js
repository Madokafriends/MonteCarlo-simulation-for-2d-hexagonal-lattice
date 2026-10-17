(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SpinPresentation = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';
  const clamp = x => Math.max(0, Math.min(1, x));

  // Pure display interpolation: never reads or advances a simulation RNG.
  function revealProgress(columnFraction, elapsed, duration = 1800) {
    const p = clamp((elapsed / duration - .72 * clamp(columnFraction)) / .28);
    return p * p * (3 - 2 * p);
  }
  function spinPose(before, after, progress) {
    const p = before === after ? 0 : clamp(progress);
    return {
      angle: (before > 0 ? 0 : Math.PI) + Math.PI * p,
      mix: p,
      lift: Math.sin(Math.PI * p) * .16,
      moving: p > 0 && p < 1
    };
  }
  function sampleMeans(samples) {
    if (!samples.length) return { count: 0, m: null, e: null };
    let m = 0, e = 0;
    for (const sample of samples) { m += sample.m; e += sample.e; }
    return { count: samples.length, m: m / samples.length, e: e / samples.length };
  }
  return { revealProgress, spinPose, sampleMeans };
});
