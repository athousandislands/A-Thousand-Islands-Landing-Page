const HELP={
 'Motion Pull':'A small horizontal elongation during the fastest part of a move. It returns to zero as the pill settles. Zero removes the velocity-based pull.',
 Depth:'Perspective difference between the focused pill and its neighbors. Higher makes the center feel farther back and the neighboring pills grow as they approach the rim. Zero keeps every pill on one plane.',
 'Travel Arc':'Curved path followed by a pill as it leaves the center. Positive lifts it toward the edges; negative dips it. This controls the motion path independently of the glass flare.',
 'Pill Size':'Width of the entire focused pill, as a percentage of screen width. Lower shows more of the previous and next projects. This resizes the whole card, including its artwork.',
 'Carousel Scale':'Scales the pills, their gaps and stage together. Use Pill Size to change how much of neighboring cards fits across the screen.',
 'Stage Height':'Vertical breathing room around the carousel. The stage automatically keeps enough room for the pills and their raised edges, avoiding flat clipping.',
 Aspect:'Pill width divided by its height. 1.5 means 3:2. Higher makes the pill flatter; lower makes it taller.',
 Gap:'Pixels between pills before Carousel Scale is applied. Lower brings the neighboring cards closer to the focused pill.',
 Reach:'How far the pill extends horizontally within the glass rim. Higher makes the edge pill reach farther inward/outward; the project itself never changes.',
 Rise:'How high the arc finishes at the outer screen edge, measured in pill heights. Positive lifts it; negative lowers it. The focused pill stays centered.',
 Rim:'Width of the distorted region at each side, relative to half the screen width. Higher moves the start of the glass farther toward the center.',
 Stretch:'How much taller the outer arc becomes. Higher flares the edge more. Available stage space limits stretching to prevent a visible flat cutoff.',
 Curve:'How quickly the arc bends as it approaches the edge. Higher concentrates the bending near the screen edge; lower makes a broader curve.',
 Glass:'Overall glass strength. Zero turns off the rim effect. Higher increases the bending, flaring and optical highlights.',
 Fold:'How far the image folds back within its own pill. This changes the refraction without ever replacing the card with its neighbor.',
 Fade:'Softness of the final exit at the actual screen edge. Zero gives a crisp edge; higher gently dissolves it over a wider strip.',
 Dispersion:'Separation of red, green and blue image details through the rim. Zero keeps colors aligned; higher adds a stronger optical fringe.',
 'Image Scale':'Zoom of the artwork inside its pill. This does not resize the pill. Use Pill Size for the whole card.',
 Spring:'How quickly a manual or automatic move settles. Higher is faster; lower is slower. The spring remains damped without a bounce.',
 Seconds:'Time between automatic advances. Hover, dragging, keyboard focus and offscreen/hidden states pause automatic movement.',
 Drag:'How far the carousel travels for a given finger or mouse movement. Higher needs less movement to change cards.',
 Wheel:'Sensitivity of horizontal wheel, Shift+wheel or focused-stage wheel navigation. Vertical page scrolling remains available.',
 Presets:'Save multiple presets in this browser, select an earlier one, or download/import JSON to keep or share settings. Phone and desktop settings are separate.'
};
export function installCarouselHelp(root) {
 const tip=document.createElement('div');tip.className='carousel-dial-tooltip';tip.id='carousel-dial-tooltip';tip.role='tooltip';tip.hidden=true;document.body.append(tip);
 let active,pinned=false;const attached=new WeakMap();
 function hide(){active?.removeAttribute('aria-describedby');active=null;pinned=false;tip.hidden=true;}
 function show(button,text){active?.removeAttribute('aria-describedby');active=button;button.setAttribute('aria-describedby',tip.id);tip.textContent=text;tip.hidden=false;const b=button.getBoundingClientRect();tip.style.left=`${Math.max(8,Math.min(innerWidth-tip.offsetWidth-8,b.right-tip.offsetWidth))}px`;tip.style.top=`${Math.max(8,b.top-tip.offsetHeight-8<8?Math.min(innerHeight-tip.offsetHeight-8,b.bottom+8):b.top-tip.offsetHeight-8)}px`;}
 function annotate(){root.querySelectorAll('.dialkit-slider-label,.dialkit-folder-title').forEach(label=>{if(attached.get(label)?.isConnected)return;const name=label.textContent.trim(),text=HELP[name];if(!text)return;const b=document.createElement('button');b.type='button';b.className='carousel-dial-help';b.textContent='?';b.setAttribute('aria-label',`About ${name}`);
 b.addEventListener('pointerdown',e=>e.stopPropagation());b.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape')hide();});
 b.addEventListener('click',e=>{e.stopPropagation();if(active===b&&pinned)hide();else{pinned=true;show(b,text);}});
 b.addEventListener('mouseenter',()=>{if(!pinned)show(b,text);});b.addEventListener('mouseleave',()=>{if(!pinned)hide();});b.addEventListener('focus',()=>{if(!pinned)show(b,text);});b.addEventListener('blur',()=>{if(!pinned)hide();});
 if(label.classList.contains('dialkit-slider-label')){b.classList.add('carousel-slider-help');label.closest('.dialkit-slider-wrapper').append(b);}else label.append(b);attached.set(label,b);
 });}
 const outside=e=>{if(active&&!active.contains(e.target)&&!tip.contains(e.target))hide();};const key=e=>{if(e.key==='Escape')hide();};
 document.addEventListener('pointerdown',outside,true);document.addEventListener('keydown',key);const observer=new MutationObserver(annotate);observer.observe(root,{childList:true,subtree:true});annotate();
 return ()=>{observer.disconnect();document.removeEventListener('pointerdown',outside,true);document.removeEventListener('keydown',key);tip.remove();};
}
