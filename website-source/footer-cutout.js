// One decoder and one small GPU pass. Only the low-chroma studio background
// is keyed; a protected facial core keeps eyes/skin/metal inside the face intact.
const VERTEX = `
attribute vec2 position;
varying vec2 uv;
void main() { uv = vec2((position.x + 1.0) * .5, (1.0 - position.y) * .5); gl_Position = vec4(position, 0., 1.); }
`;
const FRAGMENT = `
precision mediump float;
uniform sampler2D source;
uniform float removal;
uniform float softness;
varying vec2 uv;
void main() {
  vec3 rgb = texture2D(source, uv).rgb;
  float high = max(rgb.r, max(rgb.g, rgb.b));
  float low = min(rgb.r, min(rgb.g, rgb.b));
  float luminance = dot(rgb, vec3(.2126, .7152, .0722));
  float neutral = 1. - smoothstep(.045, .045 + softness, high - low);
  float grey = smoothstep(.45, .53, luminance) * (1. - smoothstep(.74, .83, luminance));
  float head = 1. - smoothstep(.82, 1.08, length((uv - vec2(.495, .40)) / vec2(.105, .245)));
  float neckWidth = mix(.045, .13, smoothstep(.70, 1., uv.y));
  float neck = (1. - smoothstep(neckWidth * .75, neckWidth, abs(uv.x - .50))) * smoothstep(.61, .70, uv.y);
  float alpha = 1. - removal * neutral * grey * (1. - max(head, neck));
  gl_FragColor = vec4(rgb * alpha, alpha);
}
`;

export function createFooterCutout(root, video, canvas, config, { useVideoClock = false } = {}) {
  let gl;
  try { gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false }); }
  catch { /* The original video remains available without a WebGL context. */ }
  if (!gl) { root.dataset.keying = 'original'; return null; }
  let active = false, lost = false, frame = 0, fallback = 0, lastTime = -1, ready = false;
  root.dataset.cutoutActive = 'false';
  let current = config, poster;
  const compile = (type, source) => {
    const shader = gl.createShader(type); gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { gl.deleteShader(shader); throw new Error('Video background shader unavailable'); }
    return shader;
  };
  let program, texture, buffer, vertex, fragment;
  try {
    vertex = compile(gl.VERTEX_SHADER, VERTEX); fragment = compile(gl.FRAGMENT_SHADER, FRAGMENT);
    program = gl.createProgram(); gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Video background program unavailable');
    gl.useProgram(program);
    buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'position'); gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    texture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  } catch {
    if (texture) gl.deleteTexture(texture); if (buffer) gl.deleteBuffer(buffer); if (program) gl.deleteProgram(program);
    if (vertex) gl.deleteShader(vertex); if (fragment) gl.deleteShader(fragment);
    root.dataset.keying = 'original'; return null;
  }
  const removal = gl.getUniformLocation(program, 'removal'), softness = gl.getUniformLocation(program, 'softness');
  function draw(source) {
    if (lost || !source) return;
    const width = source.videoWidth || source.naturalWidth, height = source.videoHeight || source.naturalHeight;
    if (!width || !height) return;
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    gl.viewport(0, 0, width, height);
    gl.uniform1f(removal, current.backgroundRemoval); gl.uniform1f(softness, current.backgroundSoftness);
    try {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      if (gl.getError() !== gl.NO_ERROR) { useOriginal(); return; }
    } catch {
      useOriginal();
      return;
    }
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (!ready) { ready = true; root.dataset.keying = 'ready'; }
  }
  const drawCurrent = () => draw(active && video.readyState >= 2 ? video : poster);
  function stop() {
    if (frame) video.cancelVideoFrameCallback?.(frame);
    cancelAnimationFrame(fallback); frame = 0; fallback = 0;
  }
  function next() {
    if (!active || lost) return;
    if (!useVideoClock && video.requestVideoFrameCallback) {
      frame = video.requestVideoFrameCallback(() => { frame = 0; if (active) { drawCurrent(); next(); } });
    } else {
      fallback = requestAnimationFrame(() => {
        fallback = 0;
        if (active) { if (video.currentTime !== lastTime) { lastTime = video.currentTime; drawCurrent(); } next(); }
      });
    }
  }
  function useOriginal() {
    lost = true;
    active = false;
    stop();
    root.dataset.keying = 'original';
    root.dataset.cutoutActive = 'false';
  }
  canvas.addEventListener('webglcontextlost', useOriginal);
  for (const event of ['loadeddata', 'seeked']) video.addEventListener(event, () => { if (active || !ready) drawCurrent(); });
  poster = new Image(); poster.onload = () => { if (!ready) drawCurrent(); }; poster.src = video.poster;
  return {
    useOriginal,
    configure(nextConfig) { current = nextConfig; drawCurrent(); },
    setActive(nextActive) {
      if (lost || active === nextActive) return;
      active = nextActive; root.dataset.cutoutActive = String(active); stop();
      if (active) { drawCurrent(); next(); }
    },
  };
}
