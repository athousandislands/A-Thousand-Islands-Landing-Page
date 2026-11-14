import { createDialKit, createDialRoot } from './vendor/dialkit/index.js';
import './vendor/dialkit/styles.css';
export function mountGlassTuning(defaults, update) {
  const host = document.createElement('div');
  host.className = 'glass-prototype-tuning';
  host.setAttribute('data-lenis-prevent', '');
  document.body.append(host);
  createDialRoot({ target: host, position: 'bottom-right', theme: 'light', defaultOpen: true });
  const kit = createDialKit('Homepage glass prototype', {
    renderer: { type: 'select', default: 'auto', options: [{value:'auto',label:'Automatic'},{value:'webgl',label:'WebGL'},{value:'fallback',label:'Current glass + glow'}] },
    refraction: [defaults.refraction,0,1,.01], edge:[defaults.edge,0,1,.01], frost:[defaults.frost,0,1,.01],
    bloom:[defaults.bloom,0,1,.01], spread:[defaults.spread,0,1,.01],
    reset:{type:'action',label:'Reset prototype'},
    copy:{type:'action',label:'Copy settings'},
  }, {id:'ati-glass-prototype',persist:true,onAction(action){if(action==='reset')kit.resetValues();if(action==='copy')navigator.clipboard.writeText(JSON.stringify(kit.getValues(),null,2)).catch(()=>{});}});
  kit.subscribe(update);
  update(kit.getValues());
}
