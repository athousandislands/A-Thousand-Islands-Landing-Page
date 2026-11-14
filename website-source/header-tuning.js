import { createDialKit, createDialRoot } from './vendor/dialkit/index.js';
import './vendor/dialkit/styles.css';

export function mountHeaderTuning() {
  const host = document.createElement('div');
  host.className = 'header-tuning';
  host.setAttribute('data-lenis-prevent', '');
  document.body.append(host);
  const help = document.createElement('details');
  help.innerHTML = '<summary>ⓘ Adjustment help</summary><p>Position values are pixels. Logo size affects phones in both orientations. Shade controls the faint button background. Collapse the panel to inspect the page.</p>';
  host.append(help);
  createDialRoot({ target:host,position:'bottom-right',theme:'light',defaultOpen:true });
  const kit=createDialKit('Mobile header',{
    headerY:[8,-8,40,1],headerInset:[17,4,48,1],
    logoSize:[19,13,28,1],logoX:[4,-30,30,1],logoY:[0,-20,20,1],
    iconSize:[24,14,28,1],iconGap:[8,0,24,1],buttonShade:[.02,0,.2,.005],
    reset:{type:'action',label:'Reset header'},
  },{id:'ati-mobile-header-v2',persist:true,onAction(action){if(action==='reset')kit.resetValues();}});
  const apply=values=>{
    const keys={headerY:'header-y',headerInset:'header-inset',logoSize:'logo-size',logoX:'logo-x',logoY:'logo-y',iconSize:'icon-size',iconGap:'icon-gap',buttonShade:'button-shade'};
    for(const [key,suffix] of Object.entries(keys))document.documentElement.style.setProperty('--mobile-'+suffix,values[key]+(key==='buttonShade'?'':'px'));
  };
  kit.subscribe(apply);apply(kit.getValues());
}
