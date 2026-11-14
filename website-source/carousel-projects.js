// Original high-resolution source images; crop coordinates center the artwork
// in the existing pill without altering or recompressing the supplied files.
export const CAROUSEL_PROJECTS = [
  { title:'Echo', href:'./echo/', framing:{"size":0.74,"x":0,"y":-3}, color:'#180403', fullBleed:true, image:new URL('./assets/images/echo cover art.png',import.meta.url).href, crop:{x:606,y:265,width:1200,height:800} },
  { title:'Pulse', href:'./pulse/', framing:{"size":1,"x":0,"y":-2}, color:'#000000', image:new URL('./assets/images/pulse cover art.png',import.meta.url).href, crop:{x:318,y:0,width:2130,height:1420} },
  { title:'Creative Portfolio', href:'./creative-portfolio/', framing:{"size":0.82,"x":0,"y":0}, color:'#cccccc', edgeBlend:true, image:new URL('./assets/images/portfolio cover.png',import.meta.url).href, crop:{x:503,y:280,width:1875,height:1250} },
];
