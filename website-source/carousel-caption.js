// Caption motion has its own finite timeline, rather than inheriting the
// carousel's rapidly changing position near the end of a spring.
export function createCarouselCaption(node, {exitDuration=240,exitShift=-4}={}) {
 let state='hidden',shown='',desired=null,animation,revision=0;
 node.style.opacity='0';
 function finish(opacity,transform){
  node.style.opacity=String(opacity);node.style.transform=transform;
  animation?.cancel();animation=undefined;
 }
 function transition(frames,duration,complete){
  const version=++revision;
  animation?.cancel();
  animation=node.animate(frames,{duration,easing:'cubic-bezier(.22,1,.36,1)',fill:'both'});
  animation.finished.then(()=>{if(version===revision)complete();},()=>{});
 }
 function reconcile(){
  if(state==='leaving')return;
  if(state!=='hidden'&&desired!==shown){
   const current=getComputedStyle(node);
   const from={opacity:current.opacity,transform:current.transform};
   state='leaving';
   transition([from,{opacity:0,transform:`translateY(${exitShift}px)`}],exitDuration,()=>{
    finish(0,'translateY(8px)');state='hidden';reconcile();
   });
  }else if(state==='hidden'&&desired!==null){
   shown=desired;node.textContent=shown;state='entering';
   transition([{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],650,()=>{
    finish(1,'translateY(0)');state='visible';reconcile();
   });
  }
 }
 return {
  update(title,{ready=true,visible=true,reduced=false}={}){
   desired=visible&&ready?title:null;
   if(!visible||reduced){
    ++revision;finish(desired===null?0:1,'translateY(0)');
    if(desired!==null){shown=desired;node.textContent=shown;}
    state=desired===null?'hidden':'visible';return;
   }
   reconcile();
  },
  hide(){this.update('',{visible:false});},
 };
}
