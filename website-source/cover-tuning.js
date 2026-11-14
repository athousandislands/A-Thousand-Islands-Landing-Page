import './cover-tuning.css';
export function mountCoverTuning(api){
 const panel=document.createElement('details');panel.className='cover-dial dialkit-root';panel.open=true;panel.setAttribute('data-lenis-prevent','');
 const summary=document.createElement('summary');summary.textContent='Project cover framing';panel.append(summary);
 const intro=document.createElement('p');intro.textContent='Adjust each image inside its pill. Values apply across screen sizes.';panel.append(intro);
 const values=api.covers(),defaults=values.map(v=>({...v}));
 try{const saved=JSON.parse(localStorage.getItem('ati-cover-framing-v1'));if(Array.isArray(saved))saved.forEach((v,i)=>{api.frameCover(i,v);Object.assign(values[i],v);});}catch{}
 const select=document.createElement('select');select.setAttribute('aria-label','Project cover');values.forEach((v,i)=>select.add(new Option(v.title,String(i))));panel.append(select);
 const fields={};
 for(const [key,label,min,max,step,help] of [
  ['size','Image size',.3,1.5,.01,'Uniform zoom: preserves image proportions. 0.8 is 80% of the original framing. The pill size stays fixed.'],
  ['x','Horizontal position',-50,50,1,'Move the artwork left (negative) or right (positive), in percent of the image frame.'],
  ['y','Vertical position',-50,50,1,'Move the artwork up (negative) or down (positive), in percent of the image frame.']]){
  const row=document.createElement('div'),name=document.createElement('label'),tip=document.createElement('details'),question=document.createElement('summary'),explanation=document.createElement('p');
  name.textContent=label;name.htmlFor='cover-'+key;question.textContent='?';question.setAttribute('aria-label','About '+label);explanation.textContent=help;tip.append(question,explanation);
  const range=document.createElement('input'),number=document.createElement('input');range.type='range';number.type='number';number.id=name.htmlFor;
  for(const input of [range,number]){input.min=min;input.max=max;input.step=step;input.setAttribute('aria-label',label+(input===range?' slider':''));input.addEventListener('input',()=>{const n=input.valueAsNumber;if(!Number.isFinite(n))return;const v=Math.max(min,Math.min(max,n));values[+select.value][key]=v;range.value=number.value=v;api.frameCover(+select.value,values[+select.value]);try{localStorage.setItem('ati-cover-framing-v1',JSON.stringify(values));}catch{}});}
  fields[key]=[range,number];row.append(name,tip,range,number);panel.append(row);
 }
 function refresh(){for(const key of Object.keys(fields))fields[key].forEach(input=>input.value=values[+select.value][key]);api.focusCover(+select.value);}
 select.addEventListener('change',refresh);
 const reset=document.createElement('button');reset.textContent='Reset this cover';reset.onclick=()=>{Object.assign(values[+select.value],defaults[+select.value]);api.frameCover(+select.value,values[+select.value]);try{localStorage.setItem('ati-cover-framing-v1',JSON.stringify(values));}catch{}refresh();};
 const download=document.createElement('button');download.textContent='Download settings';download.onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({type:'ati-cover-framing',covers:values},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='ati-cover-framing.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 panel.append(reset,download);document.body.append(panel);refresh();
}
