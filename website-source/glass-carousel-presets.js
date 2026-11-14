export function readCarouselPreset(document,ranges) {
 if(document?.type!=='ati-carousel-settings'||document.version!==1||!document.settings)throw new Error('Choose a carousel settings JSON file.');
 const values={};
 for(const [key,range] of Object.entries(ranges)) {
  if(!Array.isArray(range)||!(key in document.settings))continue;
  const value=document.settings[key];
  if(typeof value!=='number'||!Number.isFinite(value))throw new Error(`Invalid value for ${key}.`);
  values[key]=Math.min(range[2],Math.max(range[1],value));
 }
 if(!Object.keys(values).length)throw new Error('This file contains no carousel controls.');
 return values;
}
export function makeCarouselPreset(values,ranges,device) {
 const settings=Object.fromEntries(Object.keys(ranges).filter(key=>Array.isArray(ranges[key])).map(key=>[key,values[key]]));
 return {type:'ati-carousel-settings',version:1,device,settings};
}
