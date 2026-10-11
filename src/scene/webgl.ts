/**
 * Whether this browser can create a WebGL 2 context, which Three.js needs.
 * False in jsdom (no WebGL at all), so unit tests never mount the canvas.
 */
export function canUseWebGL(): boolean {
  if (typeof WebGL2RenderingContext === 'undefined') return false
  try {
    const gl = document.createElement('canvas').getContext('webgl2')
    // Free the probe context right away; browsers cap live contexts.
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
    return gl !== null
  } catch {
    return false
  }
}
