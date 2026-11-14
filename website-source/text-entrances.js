export const tickerDefaults = {
  entry: { trigger: 'section', insetPercent: 5 },
  roll: { durationMs: 550, wordStaggerMs: 65, letterStaggerMs: 8, travelRows: 0.5, curve: 'gentle' },
};

const curves = {
  original: 'cubic-bezier(.22, 1, .36, 1)',
  gentle: 'cubic-bezier(.24, .75, .33, 1)',
  balanced: 'cubic-bezier(.45, 0, .25, 1)',
  linear: 'linear',
};

export function initSectionMotion({ jumpTo } = {}) {
  const section=document.querySelector('.approach');
  const title=section.querySelector('h2');
  const detail=section.querySelector('.approach-detail');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const tracks=[];
  const words=[...title.childNodes].flatMap(node=>node.nodeType===Node.TEXT_NODE
    ? node.textContent.trim().split(/\s+/).filter(Boolean)
    : node.tagName==='SPAN'?[node.textContent]:[]);
  title.setAttribute('aria-label',words.join(' '));
  let wordIndex=0;
  function rollingWord(word) {
    const wrapper=document.createElement('span');
    wrapper.className='ticker-word';wrapper.setAttribute('aria-hidden','true');
    const order=wordIndex++;
    [...word].forEach((letter,index)=>{
      const cell=document.createElement('span');cell.className='ticker-cell';
      const track=document.createElement('span');track.className='ticker-track';
      for(let copy=0;copy<4;copy++){
        const glyph=document.createElement('span');glyph.textContent=letter;track.append(glyph);
      }
      cell.append(track);wrapper.append(cell);
      tracks.push({node:track,order,index});
    });
    return wrapper;
  }
  // Preserve the supplied desktop/mobile word breaks and all surrounding spaces.
  for(const node of [...title.childNodes]){
    if(node.nodeType===Node.TEXT_NODE){
      const fragment=document.createDocumentFragment();
      for(const part of node.textContent.split(/(\s+)/))fragment.append(/\S/.test(part)?rollingWord(part):document.createTextNode(part));
      node.replaceWith(fragment);
    }else if(node.tagName==='SPAN')node.replaceChildren(rollingWord(node.textContent));
  }
  let animations=[],inside=false,observer;
  let settings=tickerDefaults;
  const triggerElement=()=>settings.entry.trigger==='heading'?title:section;
  function settle(){animations.forEach(animation=>animation.cancel());animations=[];}
  function enter(){
    settle();
    if(reduced.matches)return;
    const roll=settings.roll;
    const start=-75+25*roll.travelRows;
    for(const {node,order,index} of tracks)animations.push(node.animate([
      {transform:start===0?'translateY(0)':`translateY(${start}%)`},{transform:'translateY(-75%)'},
    ],{duration:roll.durationMs,delay:order*roll.wordStaggerMs+index*roll.letterStaggerMs,easing:curves[roll.curve],fill:'both'}));
    animations.push(detail.animate([
      {transform:'translateY(18px)'},{transform:'translateY(0)'},
    ],{duration:650,delay:200,easing:'cubic-bezier(.22, 1, .36, 1)',fill:'both'}));
    const current=animations;
    Promise.all(current.map(animation=>animation.finished)).then(()=>{
      if(animations===current)settle();
    },()=>{});
  }
  function watchEntry(){
    observer?.disconnect();
    observer=new IntersectionObserver(entries=>{
      const visible=entries[0].isIntersecting;
      if(visible&&!inside)enter();
      if(!visible)settle();
      inside=visible;
    },{rootMargin:`0px 0px ${-settings.entry.insetPercent}% 0px`,threshold:0});
    observer.observe(triggerElement());
  }
  watchEntry();
  reduced.addEventListener('change',settle);
  return {
    update(next){
      const moved=next.entry.trigger!==settings.entry.trigger || next.entry.insetPercent!==settings.entry.insetPercent;
      settings=next;
      if(moved)watchEntry();
    },
    replay(){
      jumpTo(section);
      inside=true;
      enter();
    },
    testScrollEntry(){
      const distance=triggerElement().getBoundingClientRect().top+scrollY-innerHeight;
      // IntersectionObserver resolves root-margin percentages against viewport width.
      const boundary=distance+innerWidth*settings.entry.insetPercent/100;
      jumpTo(Math.max(0,boundary-100));
      settle();
      inside=false;
      watchEntry();
    },
  };
}
