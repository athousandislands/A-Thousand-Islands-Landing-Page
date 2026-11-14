import { flowAt } from './homepage-glass.js';
import './glass-prototype.css';

const defaults = { renderer: 'auto', refraction: .08, edge: .12, frost: .25, bloom: .18, spread: .5 };

export function initGlassPrototype() {
  if (new URLSearchParams(location.search).get('tune') !== 'glass') return;
  const hero = document.querySelector('.hero');
  const material = hero.querySelector('.glass-material');
  const canvas = document.createElement('canvas');
  canvas.className = 'glass-prototype';
  canvas.setAttribute('aria-hidden', 'true');
  material.append(canvas);
  const glow = document.createElement('div');
  glow.className = 'glass-prototype-glow';
  material.append(glow);
  let values = { ...defaults }, gl, program, frame, visible = false, lost = false, slowFrames = 0, last = 0, started = performance.now();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const vertex = 'attribute vec2 p;varying vec2 uv;void main(){uv=p*.5+.5;gl_Position=vec4(p,0.,1.);}';
  const fragment = `precision mediump float;
    varying vec2 uv; uniform vec2 size; uniform vec4 flow;
    uniform float bend,edge,frost,bloom,spread;
    vec3 field(vec2 p){
      p=(p-.5)/flow.w+.5-flow.xy*.01;
      vec3 c=vec3(.345,.643,.922);
      c=mix(c,vec3(.859,.608,.733),exp(-dot((p-vec2(.30,.28))*3.,(p-vec2(.30,.28))*3.))*.7);
      c=mix(c,vec3(.976,.463,.384),exp(-dot((p-vec2(.68,.43))*3.5,(p-vec2(.68,.43))*3.5))*.8);
      c=mix(c,vec3(1.,.776,.506),exp(-dot((p-vec2(.53,.65))*3.6,(p-vec2(.53,.65))*3.6))*.85);
      return c;
    }
    void main(){
      vec2 p=vec2(uv.x,1.-uv.y);
      float rim=pow(clamp(1.-min(min(p.x,1.-p.x),min(p.y,1.-p.y))*18.,0.,1.),2.);
      vec2 displaced=p+(p-.5)*rim*bend*.12;
      vec2 blur=vec2(frost*.018);
      vec3 c=(field(displaced)+field(displaced+blur)+field(displaced-blur))/3.;
      float light=exp(-length((p-vec2(.53,.65))/vec2(.25+spread*.35)) * 2.);
      c+=vec3(1.,.78,.54)*light*bloom*.65;
      c+=vec3(.8,.91,1.)*rim*edge*.25;
      gl_FragColor=vec4(c,1.);
    }`;
  try {
    gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, powerPreference: 'low-power' });
    if (!gl) throw Error('Unavailable');
    program = gl.createProgram();
    for (const [type, source] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]]) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw Error('Shader unavailable');
      gl.attachShader(program, shader); gl.deleteShader(shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error('Material unavailable');
    gl.useProgram(program);
    const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'p'); gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  } catch { lost = true; canvas.hidden = true; }
  const uniforms = gl && !lost ? Object.fromEntries(['size','flow','bend','edge','frost','bloom','spread'].map(name => [name, gl.getUniformLocation(program, name)])) : {};
  function paint(now) {
    cancelAnimationFrame(frame);
    const enhanced = !lost && values.renderer !== 'fallback';
    hero.dataset.glassRenderer = enhanced ? 'webgl' : 'fallback';
    glow.style.opacity = String(values.bloom);
    glow.style.filter = `blur(${12 + values.spread * 40}px)`;
    if (enhanced) {
      const width = Math.max(1, Math.round(hero.clientWidth * .75)), height = Math.max(1, Math.round(hero.clientHeight * .75));
      if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
      gl.viewport(0, 0, width, height);
      const flow = flowAt(((now-started)/90000)%1, hero.clientHeight > hero.clientWidth);
      gl.uniform4fv(uniforms.flow, flow);
      for (const [key, value] of Object.entries({bend:values.refraction,edge:values.edge,frost:values.frost,bloom:values.bloom,spread:values.spread})) gl.uniform1f(uniforms[key], value);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (last && now-last > 70 && values.renderer === 'auto') slowFrames++; else slowFrames = Math.max(0, slowFrames-1);
      if (slowFrames > 45) { lost = true; hero.dataset.glassRenderer = 'fallback'; }
    }
    last = now;
    if (visible && !document.hidden && !reduced.matches && !lost && values.renderer !== 'fallback') frame = requestAnimationFrame(paint);
  }
  const refresh = () => { last = 0; paint(performance.now()); };
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); lost = true; refresh(); });
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; if (visible) refresh(); else cancelAnimationFrame(frame); }).observe(hero);
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancelAnimationFrame(frame); else if (visible) refresh(); });
  new ResizeObserver(refresh).observe(hero);
  reduced.addEventListener('change', refresh);
  import('./glass-prototype-tuning.js').then(({ mountGlassTuning }) => mountGlassTuning(defaults, next => { values = next; refresh(); }));
  refresh();
}
