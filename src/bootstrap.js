/** three.js r182 reads this WebGPU enum at import time even for WebGL2. Firefox may not expose it at all.
 * Defining the standard enum permits the compatibility backend; it does not pretend WebGPU exists. */
if (!globalThis.GPUShaderStage)
  globalThis.GPUShaderStage = Object.freeze({ VERTEX: 1, FRAGMENT: 2, COMPUTE: 4 });
import('./main.js').catch((error) => {
  console.error(error);
  const loading = document.querySelector('#loading');
  loading.textContent = 'The sanctuary could not load. Reload the page to try again.';
});
