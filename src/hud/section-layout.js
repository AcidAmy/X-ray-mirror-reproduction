// Narrow screens reserve real layout space for sections; all image layers share the same fitted stage.
import { $ } from '../state.js';
const narrow=matchMedia('(max-width:700px)');
let selected='axial', collapsed=false, more=false;
export function syncSectionLayout(){
  const active=narrow.matches && document.body.classList.contains('running') && !$('tri').hidden;
  document.body.classList.toggle('section-mobile',active);
  const panel=$('tri');
  panel.dataset.view=selected;
  panel.classList.toggle('section-collapsed',collapsed);
  panel.classList.toggle('section-more',more);
  for(const b of panel.querySelectorAll('[data-section-view]')) b.setAttribute('aria-pressed',String(b.dataset.sectionView===selected));
  $('tri_fold').setAttribute('aria-expanded',String(!collapsed));
  $('tri_more').setAttribute('aria-expanded',String(more));
  measure();
}
function measure(){
  const root=document.documentElement;
  const header=document.querySelector('.topbar').getBoundingClientRect();
  const dock=$('quick').getBoundingClientRect();
  root.style.setProperty('--section-top',Math.ceil(header.bottom+4)+'px');
  root.style.setProperty('--section-bottom',Math.ceil(window.innerHeight-dock.top+6)+'px');
  root.style.setProperty('--section-height',Math.ceil($('tri').getBoundingClientRect().height)+'px');
  root.style.setProperty('--picture-height',$('picture_window').getBoundingClientRect().height+'px');
}
export function initSectionLayout(){
  for(const b of $('tri').querySelectorAll('[data-section-view]')) b.onclick=()=>{selected=b.dataset.sectionView;collapsed=false;more=false;syncSectionLayout();};
  $('tri_fold').onclick=()=>{collapsed=!collapsed;syncSectionLayout();};
  $('tri_more').onclick=()=>{more=!more;syncSectionLayout();};
  const observer=new ResizeObserver(measure);
  for(const el of [$('tri'),$('quick'),document.querySelector('.topbar'),$('picture_window')]) observer.observe(el);
  narrow.addEventListener('change',syncSectionLayout);
  window.addEventListener('resize',measure);
  syncSectionLayout();
}
