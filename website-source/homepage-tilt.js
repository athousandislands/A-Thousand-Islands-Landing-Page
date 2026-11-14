const settings={strength:24,settling:.2,automatic:.8,field:1.15,saturation:1.5,texture:1.35,grain:1.2,depth:.8};
let visitEnabled=false;
// Orientation only steers the colour layer; text, logo and layout stay still.
export function initHomepageTilt(hero, trigger, colour, {services=false}={}) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  if (!matchMedia('(any-pointer: coarse)').matches || !window.DeviceOrientationEvent || reduced.matches) return { flowAmount: () => 1 };
  // Apply the accepted material settings before permission; sensors remain opt-in.
  colour.style.filter=`saturate(${settings.saturation})`;
  hero.style.setProperty('--tilt-texture',settings.texture);
  hero.style.setProperty('--tilt-grain',settings.grain);
  let offered=false, enabled=false, visible=true, frame=0, previous=0, baseline=null;
  let targetX=0,targetY=0,x=0,y=0;

  const panel=document.createElement('div');
  panel.className='tilt-hint'; panel.hidden=true;
  panel.innerHTML='<p role="status">Tilt your phone</p>';
  hero.append(panel);
  const message=panel.querySelector('p');
  function tick(now) {
    frame=0;
    if(!enabled||!visible||document.hidden||reduced.matches)return;
    const dt=previous?Math.min(now-previous,64):16;previous=now;
    const follow=1-Math.exp(-dt/(settings.settling*1000));
    x+=(targetX-x)*follow;y+=(targetY-y)*follow;
    colour.style.setProperty('--tilt-x', `${-x*settings.depth}%`);
    colour.style.setProperty('--tilt-y', `${y*.4}%`);
    colour.style.setProperty('--tilt-angle', `${x*.65-y*.3}deg`);
    colour.style.scale=String(settings.field);
    colour.style.filter=`saturate(${settings.saturation})`;
    hero.style.setProperty('--tilt-texture',settings.texture);
    hero.style.setProperty('--tilt-grain',settings.grain);
    colour.style.translate=`${x}% ${y}%`;
    frame=requestAnimationFrame(tick);
  }
  function wake(){if(!frame&&enabled&&visible&&!document.hidden&&!reduced.matches){previous=0;frame=requestAnimationFrame(tick);}}
  function orient(event){
    if(!enabled||event.beta===null||event.gamma===null)return;
    if(!baseline)baseline={beta:event.beta,gamma:event.gamma};
    const dx=Math.max(-1,Math.min(1,(event.gamma-baseline.gamma)/25));
    const dy=Math.max(-1,Math.min(1,(event.beta-baseline.beta)/25));
    const angle=(screen.orientation?.angle||window.orientation||0)*Math.PI/180;
    targetX=(dx*Math.cos(angle)+dy*Math.sin(angle))*settings.strength;
    targetY=(dy*Math.cos(angle)-dx*Math.sin(angle))*settings.strength;
  }
  function enable(){
    if(enabled)return;enabled=true;hero.dataset.tilt='enabled';
    window.addEventListener('deviceorientation',orient,{passive:true});wake();
  }
  window.addEventListener('studio:tilt-enabled',enable);
  if(visitEnabled)enable();
  if(!services)trigger.addEventListener('click',async()=>{
    if(offered)return;offered=true;
    hero.dataset.tiltPrompt='true';
    try {
      // Called synchronously from the accepted tap so Safari retains user activation.
      const permission=typeof DeviceOrientationEvent.requestPermission==='function'?await DeviceOrientationEvent.requestPermission():'granted';
      if(permission!=='granted')return;
      visitEnabled=true;window.dispatchEvent(new Event('studio:tilt-enabled'));panel.hidden=false;
      setTimeout(()=>{panel.hidden=true;},4000);
    } catch { /* Declining leaves the automatic surface intact. */ }
    finally { delete hero.dataset.tiltPrompt; }
  });
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(!visible){cancelAnimationFrame(frame);frame=0;}else wake();}).observe(hero);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else wake();});
  window.addEventListener('orientationchange',()=>{baseline=null;targetX=targetY=0;});
  reduced.addEventListener('change',()=>{cancelAnimationFrame(frame);frame=0;if(reduced.matches)colour.style.translate='';else wake();});
  if(!services && new URLSearchParams(location.search).get('tune')==='tilt') {
    const controls=document.createElement('details');controls.className='tilt-dials';controls.innerHTML='<summary>Tilt tuning</summary>';
    for(const [key,label,min,max,step] of [['strength','Tilt strength',0,24,.5],['settling','Settling time',.1,1.5,.05],['automatic','Automatic flow',0,2,.05],['field','Field zoom',.8,1.6,.05],['depth','Layer drift',0,1.5,.05],['saturation','Saturation',.7,1.6,.05],['texture','Frost texture',.5,1.8,.05],['grain','Grain texture',.5,1.8,.05]]) {
      const row=document.createElement('label');row.textContent=label;
      const input=document.createElement('input');input.type='range';input.min=min;input.max=max;input.step=step;input.value=settings[key];
      const output=document.createElement('output');output.textContent=input.value;
      input.addEventListener('input',()=>{settings[key]=Number(input.value);output.textContent=input.value;});
      row.append(input,output);controls.append(row);
    }
    document.body.append(controls);
  }
  return { flowAmount: () => enabled ? settings.automatic : 1 };
}
