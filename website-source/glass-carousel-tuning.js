import { createDialKit, createDialRoot } from './vendor/dialkit/index.js';
import './vendor/dialkit/styles.css';
import './services-discovery-tuning.css';
import './glass-carousel-tuning.css';
import { carouselDefaults } from './glass-carousel-model.js';
import { readCarouselPreset, makeCarouselPreset } from './glass-carousel-presets.js';
import { installCarouselHelp } from './glass-carousel-help.js';
export function mountCarouselTuning(api) {
 const device=api.device(),defaults=carouselDefaults(device);
 const root=createDialRoot({position:'bottom-right',theme:'light',defaultOpen:false});root.element.classList.add('carousel-dial');
 const status=document.createElement('div');status.className='carousel-preset-status';status.role='status';document.body.append(status);let statusTimer;
 const notify=text=>{clearTimeout(statusTimer);status.textContent=text;statusTimer=setTimeout(()=>status.textContent='',4500);};
 const storageKey=`ati-carousel-presets-${device}-v1`;let saved=[];try{saved=JSON.parse(localStorage.getItem(storageKey)||'[]');if(!Array.isArray(saved))saved=[];}catch{}
 const options=()=>saved.length?saved.map(entry=>({value:entry.id,label:entry.name})):[{value:'none',label:'No saved presets'}];
 const schema={
  pillSize:[defaults.width*100,20,80,1],carouselScale:[defaults.scale,.6,1.4,.05],stageHeight:[defaults.height,.65,1.6,.05],
  aspect:[defaults.aspect,1.2,2.2,.05],gap:[defaults.gap,8,120,1],
  depth:[defaults.depth,0,.5,.01],travelArc:[defaults.travelArc,-.4,.5,.01],
  reach:[defaults.reach,.6,1.6,.01],rise:[defaults.rise,-.5,.5,.01],rim:[defaults.rim,.08,.75,.01],
  stretch:[defaults.stretch,0,1,.01],curve:[defaults.curve,1,4,.1],glass:[defaults.glass,0,2,.05],
  fold:[defaults.fold,0,1.8,.05],fade:[defaults.fade,0,.06,.002],dispersion:[defaults.dispersion,0,.02,.001],
  imageScale:[defaults.imageScale,.7,1.6,.01],motionPull:[defaults.motionPull,0,.04,.002],spring:[defaults.spring,4,16,.25],seconds:[defaults.seconds,1,6,.1],
  drag:[defaults.drag,.4,2,.05],wheel:[defaults.wheel,.3,2,.05],
  presets:{_collapsed:true,savedPreset:{type:'select',options:options(),default:'none'},restore:{type:'action',label:'Load selected preset'},save:{type:'action',label:'Save preset'},download:{type:'action',label:'Download JSON'},import:{type:'action',label:'Import JSON'},reset:{type:'action',label:'Reset defaults'}},
  replay:{type:'action',label:'Replay arrival'},
 };
 const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.hidden=true;root.element.append(input);
 let selected='none';
 const kit=createDialKit('Featured Work Glass',schema,{id:`ati-horizontal-glass-carousel-${device}-v7`,persist:true,onAction(path){
  try{
   if(path==='replay'){api.replay();return;}
   if(path==='presets.restore'){const entry=saved.find(entry=>entry.id===kit.getValues().presets?.savedPreset);if(entry){kit.setValues(readCarouselPreset(entry.document,schema));notify(`${entry.name} restored.`);}else notify('Save or choose a preset first.');return;}
   if(path==='presets.reset'){kit.resetValues();notify('Default settings restored.');return;}
   if(path==='presets.import'){input.click();return;}
   const document=makeCarouselPreset(kit.getValues(),schema,device);
   if(path==='presets.save'){
    const entry={id:String(Date.now()),name:`Preset ${saved.length+1} · ${new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}`,document};
    saved.push(entry);localStorage.setItem(storageKey,JSON.stringify(saved));schema.presets.savedPreset.options=options();kit.updateConfig(schema);kit.setValue('presets.savedPreset',entry.id);notify(`${entry.name} saved in this browser.`);
   }
   if(path==='presets.download'){
    const blob=new Blob([JSON.stringify(document,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=window.document.createElement('a');a.href=url;a.download=`ati-carousel-${device}-${Date.now()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('Settings downloaded as JSON.');
   }
  }catch(error){notify(`Settings could not be saved: ${error.message}`);}
 }});
 selected=kit.getValues().presets?.savedPreset||'none';
 const unsubscribe=kit.subscribe(values=>{
  const id=values.presets?.savedPreset;
  if(id&&id!=='none'&&id!==selected){selected=id;const entry=saved.find(entry=>entry.id===id);if(entry){kit.setValues(readCarouselPreset(entry.document,schema));notify(`${entry.name} restored.`);return;}}
  api.configure({...values,width:values.pillSize/100,scale:values.carouselScale,height:values.stageHeight});
 });
 input.addEventListener('change',async()=>{try{if(!input.files[0])return;const document=JSON.parse(await input.files[0].text());kit.setValues(readCarouselPreset(document,schema));notify('Settings imported.');}catch(error){notify(error.message);}finally{input.value='';}});
 const destroyHelp=installCarouselHelp(root.element);
 return ()=>{destroyHelp();clearTimeout(statusTimer);status.remove();unsubscribe();kit.destroy();root.destroy();};
}
