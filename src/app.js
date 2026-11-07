/* Trestle editor: state, canvas, panels, saving and export. Loaded after site.js and blocks.js. */
/* ---------- Helpers ---------- */
const $=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone=o=>JSON.parse(JSON.stringify(o));
const uid=()=>Math.random().toString(36).slice(2,9);
const getP=(o,p)=>p.split('.').reduce((a,k)=>a==null?a:a[k],o);
const setP=(o,p,v)=>{const ks=p.split('.'),l=ks.pop();ks.reduce((a,k)=>a[k],o)[l]=v};
const slugify=s=>String(s||'').toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g,'').trim().replace(/[\s_]+/g,'-')||'page';
const kb=n=>n<1024?n+' B':n<1048576?(n/1024).toFixed(1)+' KB':(n/1048576).toFixed(1)+' MB';
function h(t,a,...k){const e=document.createElement(t);for(const[n,v]of Object.entries(a||{})){if(v==null||v===false)continue;if(n.startsWith('on'))e.addEventListener(n.slice(2),v);else if(n==='html')e.innerHTML=v;else if(n in e&&n!=='list'&&n!=='form')e[n]=v;else e.setAttribute(n,v===true?'':v)}for(const c of k.flat())if(c!=null&&c!==false)e.append(c);return e}
const ICONS={plus:'<path d="M12 5v14M5 12h14"/>',layers:'<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/>',pages:'<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/>',theme:'<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18c2 0 2-2 1-3s0-3 2-3h3c2 0 3-1 3-3 0-5-4-9-9-9Z"/><circle cx="8" cy="10" r="1"/><circle cx="12" cy="7.5" r="1"/>',edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/>',up:'<path d="M12 19V5M6 11l6-6 6 6"/>',down:'<path d="M12 5v14M6 13l6 6 6-6"/>',copy:'<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>',trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',save:'<path d="M6 3h12v18l-6-4-6 4z"/>',grip:'<circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>',undo:'<path d="M9 7 4 12l5 5"/><path d="M4 12h11a5 5 0 0 1 0 10h-3"/>',redo:'<path d="m15 7 5 5-5 5"/><path d="M20 12H9a5 5 0 0 0 0 10h3"/>',desk:'<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',tab:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M11 18h2"/>',ph:'<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',x:'<path d="M6 6l12 12M18 6 6 18"/>',folder:'<path d="M3 6h7l2 2h9v11H3z"/>',spark:'<path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/>'};
const ico=n=>`<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n]}</svg>`;
const icoEl=n=>{const s=document.createElement('span');s.style.display='contents';s.innerHTML=ico(n);return s};
function thumb(t){const r=t.split(';').map(x=>{const m=x.split(' ');const c=(m[3].match(/[aic]$/)||['b'])[0];return `<rect x="${m[0]}" y="${m[1]}" width="${m[2]}" height="${parseFloat(m[3])}" rx=".8" class="t-${c}"/>`}).join('');return `<svg viewBox="0 0 60 36" aria-hidden="true">${r}</svg>`}
let toastT;function toast(m){const t=$('#toast');t.textContent=m;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>t.hidden=true,3200)}
function sanitize(html){const d=new DOMParser().parseFromString('<body>'+(html||''),'text/html');const out=n=>[...n.childNodes].map(c=>{if(c.nodeType===3)return esc(c.textContent);if(c.nodeType!==1)return '';const t=c.tagName.toLowerCase(),i=out(c);if(t==='br')return '<br>';if(t==='div'||t==='p')return i+'<br>';if(['b','strong'].includes(t))return `<b>${i}</b>`;if(['i','em'].includes(t))return `<i>${i}</i>`;if(t==='a'){const u=c.getAttribute('href')||'';return /^(https?:|mailto:|tel:|#)/i.test(u)?`<a href="${esc(u)}">${i}</a>`:i}return i}).join('');return out(d.body).replace(/(<br>)+$/,'')}

/* ---------- Rendering a site. One renderer serves the editor, the preview and the export. ---------- */
function baseCtx(site,page,mode,mediaFiles){
 const editing=mode==='edit',live=mode==='export';
 const src=v=>{if(!v)return '';if(v.startsWith('art:'))return artURI(v.slice(4),site.theme);if(v.startsWith('media:')){const id=v.slice(6);if(mediaFiles&&mediaFiles[id])return mediaFiles[id];const m=site.media?.[id];return m?(m.url||m.data||''):''}return /^(https?:|data:image|\/)/i.test(v)?v:''};
 const fileOf=pg=>pg.id===site.pages[0].id?'index.html':pg.slug+'.html';
 const href=v=>{v=v||'';if(!v)return ' href="#"';if(v.startsWith('page:')){const pg=site.pages.find(x=>x.id===v.slice(5));if(!pg)return ' href="#"';return live?` href="${fileOf(pg)}"`:` href="#" data-page="${pg.id}"`}if(/^\s*(javascript|data):/i.test(v))return ' href="#"';return ` href="${esc(v)}"`};
 return {site,page,mode,editing,live,src,href,fileOf};
}
function blockCtx(b,base){
 const p=b.props,c={...base};
 c.t=(path,tag,cls='')=>{const val=getP(p,path);if(!val&&!base.editing)return '';const ed=base.editing?` data-edit="${path}" contenteditable="plaintext-only" spellcheck="false" data-ph="Type here"`:'';return `<${tag}${cls?` class="${cls}"`:''}${ed}>${esc(val)}</${tag}>`};
 c.r=(path,tag,cls='')=>{const val=getP(p,path);if(!val&&!base.editing)return '';const ed=base.editing?` data-edit="${path}" data-rich="1" contenteditable="true" spellcheck="false" data-ph="Type here"`:'';return `<${tag}${cls?` class="${cls}"`:''}${ed}>${sanitize(val)}</${tag}>`};
 c.img=(path,cls='',alt)=>{const val=getP(p,path);if(!val&&!base.editing)return '';return `<img${cls?` class="${cls}"`:''} src="${esc(base.src(val))}" alt="${esc(alt?getP(p,alt):'')}" loading="lazy"${base.editing?` data-img="${path}" draggable="false"`:''}>`};
 c.btn=(path,cls='')=>{const val=getP(p,path)||{};if(!val.label)return '';return `<a class="btn ${cls}"${base.href(val.link)}>${base.editing?`<span data-edit="${path}.label" contenteditable="plaintext-only" spellcheck="false">${esc(val.label)}</span>`:esc(val.label)}</a>`};
 return c;
}
function sectionHTML(b,base){
 const d=BLOCKS[b.type];if(!d)return '';const s=b.style||{},c=blockCtx(b,base),p=b.props;
 const bg=s.bg||(b.type==='hero'&&p.variant==='cover'?p.image:'');
 const cls=['sec','b-'+b.type,'v-'+(p.variant||'x'),'tone-'+(s.tone||'default'),'pad-'+(s.pad||(b.type==='header'||b.type==='footer'?(b.type==='footer'?'m':'0'):'m')),'al-'+(s.align||'l'),'w-'+(s.width||'x')];
 if((s.ang||'').includes('t'))cls.push('ang-t');if((s.ang||'').includes('b'))cls.push('ang-b');if(s.show==='d')cls.push('hide-m');if(s.show==='m')cls.push('hide-d');if(bg)cls.push('has-bg');
 if(b.type==='header'){cls.push('nav');if(p.sticky)cls.push('sticky')}
 const tag=b.type==='header'?'header':b.type==='footer'?'footer':'section';
 const st=bg?` style="--bgimg:url('${esc(base.src(bg))}');--ov:${(s.overlay??60)/100}"`:'';
 const id=s.anchor?` id="${esc(s.anchor)}"`:'';
 const ed=base.editing?` data-block="${b.id}"`:'';
 const plus=base.editing&&b.type!=='footer'?`<button class="ed-plus" data-plus="${b.id}" title="Add a block here" aria-label="Add a block here">+</button>`:'';
 const deco=s.deco&&!d.global?`<img class="deco deco-${s.decoX||'r'} deco-${s.decoY||'m'}${s.decoHide!==false?' deco-hm':''}" src="${esc(base.src(s.deco))}" alt="" aria-hidden="true" style="--ds:${+s.decoSize||170}px;--dp:${(s.decoPeek??30)/100}">`:'';
 return `<${tag} class="${cls.join(' ')}"${id}${st}${ed}>${d.render(p,c,b)}${deco}${plus}</${tag}>`;
}
function pageHTML(site,page,mode,mf){const base=baseCtx(site,page,mode,mf);return sectionHTML(site.header,base)+(mode==='export'?'<main>':'')+page.blocks.map(b=>sectionHTML(b,base)).join('')+(mode==='export'?'</main>':'')+sectionHTML(site.footer,base)}
function ensureFonts(t){const u=fontsHref([t.head,t.body]);let l=$('#sitefonts');if(!l){l=h('link',{id:'sitefonts',rel:'stylesheet'});document.head.append(l)}if(l.getAttribute('href')!==u)l.href=u}

/* ---------- Site model ---------- */
function mkBlock(type,props={},style={},anchor){const d=BLOCKS[type];const def=clone(d.def);const b={id:uid(),type,props:{...def,...clone(props)},style:{...(d.style||{}),...clone(style)}};if(anchor)b.style.anchor=anchor;return b}
function fromStarter(key){
 const t=STARTERS[key];const pages=t.pages.map(p=>({id:uid(),name:p.name,slug:slugify(p.name),title:p.title||'',desc:p.desc||'',inNav:true,blocks:p.blocks.map(x=>mkBlock(x.type,x.props,x.style,x.anchor))}));
 const site={id:uid(),name:t.name,theme:{...THEMES[t.theme],preset:t.theme},pages,media:{},updatedAt:Date.now(),
  header:{id:'header',type:'header',props:{...clone(BLOCKS.header.def),...clone(t.header||{})},style:{}},footer:{id:'footer',type:'footer',props:{...clone(BLOCKS.footer.def),...clone(t.footer||{})},style:{tone:'tint'}}};
 const names={};pages.forEach(p=>names[p.slug]='page:'+p.id);
 const fix=o=>{if(Array.isArray(o))o.forEach(fix);else if(o&&typeof o==='object')for(const k in o){if(k==='link'&&names[o[k]])o[k]=names[o[k]];else fix(o[k])}};
 fix(pages);fix(site.header);fix(site.footer);return site;
}
let site=null,page=null,sel=null,device='desktop',panel='add',insTab='content',insertAt=null,myBlocks=[],sheet=null;
const openItems=new Set();
const curBlocks=()=>page.blocks;
const blockById=id=>id==='header'?site.header:id==='footer'?site.footer:page.blocks.find(b=>b.id===id);
const selBlock=()=>sel?blockById(sel):null;

/* ---------- History ---------- */
const H={stack:[],i:-1,key:null,t:0};
const snap=()=>JSON.stringify({name:site.name,theme:site.theme,pages:site.pages,header:site.header,footer:site.footer});
function histReset(){H.stack=[snap()];H.i=0;H.key=null;renderTopState()}
function touch(key){const s=snap(),now=Date.now();if(key&&key===H.key&&now-H.t<900){H.stack[H.i]=s}else{H.stack.length=H.i+1;H.stack.push(s);if(H.stack.length>120)H.stack.shift();H.i=H.stack.length-1}H.key=key||null;H.t=now;scheduleSave();renderTopState()}
function restore(j){const o=JSON.parse(j);Object.assign(site,o);page=site.pages.find(p=>p.id===page.id)||site.pages[0];if(sel&&!blockById(sel))sel=null;renderAll();scheduleSave()}
function undo(){if(H.i>0){H.i--;H.key=null;restore(H.stack[H.i])}}
function redo(){if(H.i<H.stack.length-1){H.i++;H.key=null;restore(H.stack[H.i])}}

/* ---------- Canvas ---------- */
const host=()=>$('#host');let shadow;
const WID={desktop:1280,tablet:768,phone:390};
function renderCanvas(){
 ensureFonts(site.theme);
 const blocks=page.blocks.length?'':'<div class="ed-empty">This page is empty. Choose a block from the Add panel to start.</div>';
 const inner=pageHTML(site,page,'edit');
 const main=inner.replace(/(<footer )/,blocks+'$1');
 shadow.innerHTML=`<style>${SITE_CSS}${EDIT_CSS}</style><div class="tr-site" style="${themeVars(site.theme)}">${main}</div>`;
 sizeFrame();paintSel();
}
function blockEl(id){return shadow.querySelector(`[data-block="${id}"]`)}
function rerenderBlock(id){const b=blockById(id),el=blockEl(id);if(!el||!b)return renderCanvas();const t=document.createElement('template');t.innerHTML=sectionHTML(b,baseCtx(site,page,'edit'));el.replaceWith(t.content);paintSel()}
function sizeFrame(){const f=$('#frame'),sc=$('#scroller'),hs=host();
 if(isPhone()){f.style.width='100%';f.style.zoom=1;f.style.minHeight='';hs.style.setProperty('--iz',1);return}
 const w=WID[device],z=Math.max(.3,Math.min(1,(sc.clientWidth-44)/w));f.style.width=w+'px';f.style.zoom=z;f.style.minHeight=Math.round((sc.clientHeight-22)/z)+'px';hs.style.setProperty('--iz',(1/z).toFixed(3));
 const r=$('#ruler span');if(r)r.textContent=w+' px'+(z<1?' at '+Math.round(z*100)+'%':'')+' · '+(device==='desktop'?'Desktop':device==='tablet'?'Tablet':'Phone')}
function paintSel(){shadow.querySelectorAll('.ed-sel').forEach(e=>e.classList.remove('ed-sel'));shadow.querySelector('.ed-bar')?.remove();if(!sel)return;const el=blockEl(sel),b=selBlock();if(!el||!b)return;el.classList.add('ed-sel');
 const i=page.blocks.indexOf(b),glob=BLOCKS[b.type].global;const bar=document.createElement('div');bar.className='ed-bar';bar.setAttribute('contenteditable','false');
 const btn=(a,ic,t,dis)=>`<button data-act="${a}" title="${t}" aria-label="${t}" ${dis?'disabled':''}>${ico(ic)}</button>`;
 bar.innerHTML=`<b>${esc(BLOCKS[b.type].name)}</b>`+(glob?'':`<button class="ed-grip" data-act="grip" title="Drag to move" aria-label="Drag to move">${ico('grip')}</button>`+btn('up','up','Move up',i===0)+btn('down','down','Move down',i===page.blocks.length-1)+btn('dup','copy','Duplicate')+btn('keep','save','Save to My blocks')+btn('del','trash','Delete'));el.append(bar)}
function select(id,opts={}){const changed=sel!==id;sel=id;if(changed){insTab='content';openItems.clear()}paintSel();renderInspector();if(panel==='layers')renderPanel();if(opts.scroll&&id)blockEl(id)?.scrollIntoView({block:'center',behavior:'smooth'})}
function addBlock(b,idx){const list=page.blocks;idx=idx==null?(insertAt??(sel&&list.findIndex(x=>x.id===sel)>=0?list.findIndex(x=>x.id===sel)+1:list.length)):idx;list.splice(idx,0,b);insertAt=null;sel=b.id;renderCanvas();renderInspector();renderPanel();touch();closeSheet();requestAnimationFrame(()=>blockEl(b.id)?.scrollIntoView({block:'center',behavior:'smooth'}));toast(BLOCKS[b.type].name+' added')}
function moveBlock(id,to){const l=page.blocks,i=l.findIndex(b=>b.id===id);if(i<0)return;const[b]=l.splice(i,1);if(to>i)to--;l.splice(to,0,b);renderCanvas();if(panel==='layers')renderPanel();touch()}
function reId(o){if(o.id)o.id=uid();return o}
function dupBlock(id){const b=blockById(id);const n=reId(clone(b));if(n.style.anchor)delete n.style.anchor;addBlock(n,page.blocks.indexOf(b)+1)}
function delBlock(id){page.blocks=page.blocks.filter(b=>b.id!==id);sel=null;renderCanvas();renderInspector();renderPanel();touch();toast('Block deleted. Press Undo to bring it back.')}
function keepBlock(id){const b=clone(blockById(id));const nm=BLOCKS[b.type].name+' · '+String(b.props.title||b.props.logoText||'Saved').slice(0,26);myBlocks.unshift({id:uid(),name:nm,block:b});saveMine();if(panel==='add')renderPanel();toast('Saved to My blocks')}
function blockAct(a,id,ev){if(a==='up')moveBlock(id,page.blocks.findIndex(b=>b.id===id)-1);if(a==='down')moveBlock(id,page.blocks.findIndex(b=>b.id===id)+2);if(a==='dup')dupBlock(id);if(a==='del')delBlock(id);if(a==='keep')keepBlock(id)}

function wireCanvas(){
 shadow=host().attachShadow({mode:'open'});
 shadow.addEventListener('pointerdown',e=>{const g=e.target.closest('[data-act="grip"]');if(g){e.preventDefault();const id=e.target.closest('[data-block]').dataset.block;dragBlock({kind:'move',id,label:BLOCKS[blockById(id).type].name},e)}});
 shadow.addEventListener('click',e=>{const t=e.target;
  const a=t.closest('[data-act]');if(a){e.preventDefault();const id=a.closest('[data-block]').dataset.block;blockAct(a.dataset.act,id,e);return}
  const pl=t.closest('[data-plus]');if(pl){e.preventDefault();const id=pl.dataset.plus;insertAt=id==='header'?0:page.blocks.findIndex(b=>b.id===id)+1;openPanel('add');return}
  if(t.closest('a,button,summary,label'))e.preventDefault();
  const be=t.closest('[data-block]');if(!be){select(null);return}
  const id=be.dataset.block,was=sel===id,im=t.closest('[data-img]');
  if(!was)select(id);
  if(im&&was){const b=selBlock(),path=im.dataset.img;openMedia(getP(b.props,path),v=>{setField(b,path,v,{inspector:true})})}
 });
 shadow.addEventListener('submit',e=>e.preventDefault());
 shadow.addEventListener('error',e=>{if(e.target.tagName==='IMG'&&!e.target.dataset.failed){e.target.dataset.failed=1;e.target.src=artURI(6,site.theme)}},true);
 shadow.addEventListener('input',e=>{const el=e.target.closest?.('[data-edit]');if(!el)return;const id=el.closest('[data-block]').dataset.block,b=blockById(id),path=el.dataset.edit;
  const val=el.dataset.rich?sanitize(el.innerHTML):el.textContent;setP(b.props,path,val);syncField(path,val);touch('txt:'+id+path)});
 shadow.addEventListener('keydown',e=>{const el=e.target.closest?.('[data-edit]');if(!el)return;if(e.key==='Escape'){el.blur();return}
  if(e.key==='Enter'){e.preventDefault();if(el.dataset.rich||el.matches('p,blockquote,.prose'))document.execCommand(el.dataset.rich?'insertLineBreak':'insertText',false,el.dataset.rich?null:'\n');else el.blur()}});
 shadow.addEventListener('paste',e=>{const el=e.target.closest?.('[data-edit]');if(!el)return;e.preventDefault();document.execCommand('insertText',false,e.clipboardData.getData('text/plain'))});
 shadow.addEventListener('focusin',e=>{const el=e.target.closest?.('[data-rich]');if(el)showRT(el)});
 shadow.addEventListener('focusout',e=>{const el=e.target.closest?.('[data-edit]');if(!el)return;setTimeout(()=>{if(!$('#rt').contains(document.activeElement)&&!shadow.activeElement?.dataset?.rich)$('#rt').hidden=true},120);});
}
/* Formatting bar for rich text */
let rtEl=null,rtRange=null;
function showRT(el){rtEl=el;const r=el.getBoundingClientRect(),t=$('#rt');t.innerHTML='';t.hidden=false;t.append(h('button',{type:'button',title:'Bold',ariaLabel:'Bold',onmousedown:e=>{e.preventDefault();document.execCommand('bold');el.dispatchEvent(new Event('input',{bubbles:true}))}},'B'),h('button',{type:'button',title:'Italic',ariaLabel:'Italic',style:'font-style:italic',onmousedown:e=>{e.preventDefault();document.execCommand('italic');el.dispatchEvent(new Event('input',{bubbles:true}))}},'I'),h('button',{type:'button',title:'Add link',ariaLabel:'Add link',style:'width:auto;padding:0 8px',onmousedown:e=>{e.preventDefault();const s=(shadow.getSelection?shadow.getSelection():document.getSelection());rtRange=s&&s.rangeCount?s.getRangeAt(0).cloneRange():null;if(!rtRange||rtRange.collapsed){toast('Select some words first, then add a link.');return}linkInput(el)}},'Link'));t.style.left=Math.max(8,r.left)+'px';t.style.top=Math.max(58,r.top-40)+'px'}
function linkInput(el){const t=$('#rt');t.innerHTML='';const i=h('input',{type:'text',placeholder:'https://… or tel:…',ariaLabel:'Link address'});const apply=()=>{const u=i.value.trim();el.focus();const s=shadow.getSelection?shadow.getSelection():document.getSelection();s.removeAllRanges();s.addRange(rtRange);if(/^(https?:|mailto:|tel:|#)/i.test(u))document.execCommand('createLink',false,u);else if(u)document.execCommand('createLink',false,'https://'+u);el.dispatchEvent(new Event('input',{bubbles:true}));showRT(el)};t.append(i,h('button',{type:'button',style:'width:auto;padding:0 8px',onclick:apply},'Add'));i.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();apply()}});i.focus()}

/* Drag and drop: blocks from the library, on the canvas and in Layers all share this */
function dragBlock(info,ev){
 const ghost=$('#ghost'),sc=$('#scroller');let idx=null,line=null;let moved=false;
 const els=()=>[...shadow.querySelectorAll('[data-block]')].filter(e=>e.dataset.block!=='header'&&e.dataset.block!=='footer');
 const place=y=>{const list=els();let i=list.length;for(let k=0;k<list.length;k++){const r=list[k].getBoundingClientRect();if(y<r.top+r.height/2){i=k;break}}idx=i;if(!line){line=document.createElement('div');line.className='ed-drop'}const ref=list[i];if(ref)ref.before(line);else{const f=shadow.querySelector('footer');f.before(line)}};
 const mv=e=>{if(!moved){moved=true;ghost.hidden=false;ghost.textContent=info.label}ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px';const r=sc.getBoundingClientRect();if(e.clientX>r.left-40&&e.clientX<r.right+40){place(e.clientY);if(e.clientY<r.top+50)sc.scrollTop-=14;if(e.clientY>r.bottom-50)sc.scrollTop+=14}else{line?.remove();idx=null}};
 const up=()=>{removeEventListener('pointermove',mv);removeEventListener('pointerup',up);removeEventListener('pointercancel',up);ghost.hidden=true;line?.remove();if(moved&&idx!=null){if(info.kind==='move'){moveBlock(info.id,idx)}else addBlock(info.make(),idx)}else if(!moved&&info.tap)info.tap()};
 addEventListener('pointermove',mv);addEventListener('pointerup',up);addEventListener('pointercancel',up);
}
function dragRow(id,ev,rowsEl){
 const rows=[...rowsEl.querySelectorAll('[data-rid]')];const line=h('div',{className:'lr-drop'});let idx=null;
 const mv=e=>{let i=rows.length;for(let k=0;k<rows.length;k++){const r=rows[k].getBoundingClientRect();if(e.clientY<r.top+r.height/2){i=k;break}}idx=i;if(rows[i])rows[i].before(line);else rows[rows.length-1].after(line)};
 const up=()=>{removeEventListener('pointermove',mv);removeEventListener('pointerup',up);line.remove();if(idx!=null)moveBlock(id,idx)};
 addEventListener('pointermove',mv);addEventListener('pointerup',up);
}

/* ---------- Left panels ---------- */
function openPanel(p){panel=p;if(isPhone()){sheet=p}else if(innerWidth<=980)$('#insp').classList.remove('open');renderRail();renderPanel()}
const isPhone=()=>innerWidth<=760;
function closeSheet(){if(isPhone()){sheet=null;renderRail()}}
function renderRail(){const r=$('#rail');r.innerHTML='';[['add','plus','Add'],['layers','layers','Layers'],['pages','pages','Pages'],['theme','theme','Theme']].forEach(([k,i,l])=>{const on=isPhone()?sheet===k:panel===k;const b=h('button',{type:'button',onclick:()=>{if(isPhone()&&sheet===k){closeSheet();return}openPanel(k)},'aria-pressed':String(on),html:ico(i)+`<span>${l}</span>`});r.append(b)});const eb=h('button',{type:'button',className:'only-phone','aria-pressed':String(isPhone()?sheet==='edit':$('#insp').classList.contains('open')),onclick:()=>{if(isPhone()){sheet=sheet==='edit'?null:'edit'}else $('#insp').classList.toggle('open');renderRail()},html:ico('edit')+'<span>Edit</span>'});r.append(eb);if(isPhone()){$('#panel').classList.toggle('open',!!sheet&&sheet!=='edit');$('#insp').classList.toggle('open',sheet==='edit')}else $('#panel').classList.remove('open')}
function renderPanel(){const el=$('#panel'),sc=el.scrollTop,focusId=document.activeElement?.id;el.innerHTML='';({add:panelAdd,layers:panelLayers,pages:panelPages,theme:panelTheme}[panel])(el);el.scrollTop=sc;if(focusId==='libq'){const q=$('#libq');if(q){q.focus();q.setSelectionRange(q.value.length,q.value.length)}}}
const phead=(t,x)=>h('div',{className:'ph'},h('h2',{},t),x||null);
let libQ='';
function panelAdd(el){el.append(phead('Add a block'));const b=h('div',{className:'pb'});
 if(insertAt!=null)b.append(h('div',{className:'notice'},h('span',{},insertAt===0?'Adding at the top of the page':'Adding below '+BLOCKS[page.blocks[insertAt-1]?.type]?.name),h('button',{type:'button',onclick:()=>{insertAt=null;renderPanel()}},'Cancel')));
 b.append(h('input',{type:'text',id:'libq',placeholder:'Search blocks',ariaLabel:'Search blocks',value:libQ,oninput:e=>{libQ=e.target.value;renderPanel()}}));
 const q=libQ.toLowerCase();const tile=(name,tt,make,title)=>{const t=h('button',{type:'button',className:'tile',title:title||'Drag onto the page or click to add',html:thumb(tt)+`<b>${esc(name)}</b>`});
  t.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')return;const sx=e.clientX,sy=e.clientY;const m=ev=>{if(Math.hypot(ev.clientX-sx,ev.clientY-sy)>6){removeEventListener('pointermove',m);removeEventListener('pointerup',u);t._dragged=true;dragBlock({kind:'new',label:name,make},ev)}};const u=()=>{removeEventListener('pointermove',m);removeEventListener('pointerup',u)};addEventListener('pointermove',m);addEventListener('pointerup',u)});
  t.addEventListener('click',()=>{if(t._dragged){t._dragged=false;return}addBlock(make())});return t};
 if(myBlocks.length&&!q){const g=h('div',{className:'lib'});myBlocks.forEach(m=>g.append(tile(m.name,BLOCKS[m.block.type].thumb||'6 6 48 24c',()=>{const n=clone(m.block);n.id=uid();delete n.style.anchor;return n})));b.append(h('div',{className:'f'},h('div',{className:'lbl'},'My blocks'),g))}
 let any=false;GROUPS.forEach(gn=>{const list=Object.entries(BLOCKS).filter(([k,d])=>d.group===gn&&(!q||(d.name+' '+d.desc).toLowerCase().includes(q)));if(!list.length)return;any=true;const g=h('div',{className:'lib'});list.forEach(([k,d])=>g.append(tile(d.name,d.thumb,()=>mkBlock(k),d.desc)));b.append(h('div',{className:'f'},h('div',{className:'lbl'},gn),g))});
 if(!any)b.append(h('p',{className:'note'},'No blocks match that search.'));el.append(b)}
const blurb=b=>{const p=b.props;return String(p.title||p.logoText||p.address||(p.items&&p.items.length+' items')||'').replace(/<[^>]+>/g,'')};
function panelLayers(el){el.append(phead('Layers'));const b=h('div',{className:'pb'});const rows=h('div',{className:'rows'});
 const row=(bl,fixed)=>{const on=sel===bl.id;const r=h('div',{className:'lr'+(on?' on':'')+(fixed?' fixed':''),role:'button',tabIndex:0,onclick:()=>select(bl.id,{scroll:true}),onkeydown:e=>{if(e.key==='Enter')select(bl.id,{scroll:true})}});if(!fixed)r.dataset.rid=bl.id;const g=h('span',{className:'gr',html:ico('grip')});if(!fixed)g.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();dragRow(bl.id,e,rows)});r.append(g,h('span',{className:'nm'},h('b',{},BLOCKS[bl.type].name),h('span',{},blurb(bl)||' ')));return r};
 rows.append(row(site.header,1));page.blocks.forEach(x=>rows.append(row(x)));rows.append(row(site.footer,1));b.append(rows,h('p',{className:'note'},'The header and footer repeat on every page.'));el.append(b)}
function panelPages(el){el.append(phead('Pages',h('button',{type:'button',className:'btn',onclick:addPage,html:ico('plus')+'New page'})));const b=h('div',{className:'pb'});const rows=h('div',{className:'rows'});
 site.pages.forEach((p,i)=>{const r=h('div',{className:'lr'+(p===page?' on':'')},h('button',{type:'button',className:'nm',style:'border:0;background:none;text-align:left;padding:3px 4px',onclick:()=>goPage(p.id)},h('b',{},p.name),h('span',{},i===0?'index.html · Home page':p.slug+'.html')));
  r.append(h('button',{type:'button',className:'ib',title:'Move up',ariaLabel:'Move '+p.name+' up',disabled:i===0,html:ico('up'),onclick:()=>{site.pages.splice(i,1);site.pages.splice(i-1,0,p);renderPanel();renderCanvas();touch()}}));rows.append(r)});b.append(rows);
 const p=page;const f=(lab,val,on,hint,ta)=>h('div',{className:'f'},h('label',{},lab),h(ta?'textarea':'input',{type:ta?undefined:'text',value:val,oninput:on}),hint?h('div',{className:'hint'},hint):null);
 b.append(h('div',{className:'lbl'},'This page'),f('Page name',p.name,e=>{p.name=e.target.value;renderCanvas();touch('pg'+p.id)}),f('Web address',p.slug,e=>{p.slug=slugify(e.target.value);touch('pgs'+p.id)},site.pages[0]===p?'This is the home page, so it publishes as index.html.':p.slug+'.html'),
  f('Search engine title',p.title,e=>{p.title=e.target.value;touch('pgt'+p.id)},'Shows in the browser tab and in Google results.'),f('Search engine description',p.desc,e=>{p.desc=e.target.value;touch('pgd'+p.id)},(p.desc||'').length+' of about 155 characters',true),
  h('label',{className:'tog'},'Show in the menu',h('input',{type:'checkbox',checked:p.inNav!==false,onchange:e=>{p.inNav=e.target.checked;renderCanvas();touch()}})),
  h('div',{className:'acts'},h('button',{type:'button',className:'btn',onclick:dupPage,html:ico('copy')+'Duplicate'}),h('button',{type:'button',className:'btn danger',disabled:site.pages.length<2,onclick:()=>confirmDo('Delete “'+p.name+'”?','Press Undo straight after if you change your mind.','Delete page',()=>{site.pages=site.pages.filter(x=>x!==p);page=site.pages[0];sel=null;renderAll();touch()}),html:ico('trash')+'Delete'})));el.append(b)}
function goPage(id){page=site.pages.find(p=>p.id===id);sel=null;insertAt=null;renderAll();closeSheet();$('#scroller').scrollTop=0}
function addPage(){const n=site.pages.length+1;const p={id:uid(),name:'New page '+n,slug:'page-'+n,title:'',desc:'',inNav:true,blocks:[mkBlock('banner',{title:'New page'})]};site.pages.push(p);goPageKeep(p)}
function goPageKeep(p){page=p;sel=null;renderAll();touch()}
function dupPage(){const p=clone(page);p.id=uid();p.name+=' copy';p.slug+='-copy';p.blocks.forEach(b=>{b.id=uid()});site.pages.splice(site.pages.indexOf(page)+1,0,p);goPageKeep(p)}
let themeRaf;function themeChanged(key){cancelAnimationFrame(themeRaf);themeRaf=requestAnimationFrame(renderCanvas);touch(key)}
function panelTheme(el){el.append(phead('Theme'));const b=h('div',{className:'pb'}),t=site.theme;
 const sw=h('div',{className:'swatches'});Object.entries(THEMES).forEach(([k,v])=>{const s=h('button',{type:'button',className:'sw'+(t.preset===k?' on':''),onclick:()=>{site.theme={...v,preset:k,scale:t.scale};renderCanvas();renderPanel();touch()}});s.innerHTML=`<i><span style="background:${v.bg}"></span><span style="background:${v.surface}"></span><span style="background:${v.accent}"></span></i><b>${v.label}</b>`;sw.append(s)});b.append(sw,h('div',{className:'lbl'},'Colours'));
 const cc=(lab,k,fg)=>{const chip=h('span',{className:'chip'});const up=()=>{if(!fg){chip.hidden=true;return}const r=contrast(t[k],t[fg]);chip.textContent=r.toFixed(1)+':1';chip.className='chip '+(r>=4.5?'ok':r>=3?'warn':'bad');chip.title=r>=4.5?'Easy to read':r>=3?'Large text only':'Hard to read'};up();return h('div',{className:'colr'},h('input',{type:'color',id:'col-'+k,value:t[k],ariaLabel:lab,oninput:e=>{t[k]=e.target.value;t.preset='';up();themeChanged('col'+k)}}),h('label',{htmlFor:'col-'+k},lab),chip)};
 b.append(cc('Background','bg'),cc('Tint','surface'),cc('Text','text','bg'),cc('Quiet text','muted','bg'),cc('Accent','accent'));b.append(h('div',{className:'lbl'},'Fonts'));
 const fs=(lab,k)=>h('div',{className:'f'},h('label',{},lab),h('select',{ariaLabel:lab,onchange:e=>{t[k]=e.target.value;t.preset='';themeChanged()}},Object.keys(FONTS).map(n=>h('option',{value:n,selected:t[k]===n},n))));
 b.append(fs('Headings','head'),fs('Text','body'),h('label',{className:'tog'},'Capital-letter headings',h('input',{type:'checkbox',checked:!!t.upper,onchange:e=>{t.upper=e.target.checked;t.preset='';themeChanged()}})));b.append(h('div',{className:'lbl'},'Shape'),rangeF('Corners',t.radius,0,28,v=>{t.radius=v;themeChanged('rad')},'px'),rangeF('Text size',Math.round((t.scale||1)*100),85,120,v=>{t.scale=v/100;themeChanged('scl')},'%'));el.append(b)}
function rangeF(lab,val,min,max,on,unit='px',step=1){val=val??min;const o=h('output',{},val+unit);return h('div',{className:'f'},h('label',{},lab),h('div',{className:'rng'},h('input',{type:'range',min,max,step,value:val,ariaLabel:lab,oninput:e=>{o.textContent=e.target.value+unit;on(+e.target.value)}}),o))}

/* ---------- Inspector ---------- */
function setField(b,path,val,o={}){setP(b.props,path,val);rerenderBlock(b.id);touch(o.key);if(o.inspector)renderInspector();}
function syncField(path,val){const i=$(`#insp [data-path="${path}"]`);if(i&&document.activeElement!==i)i.value=val}
function seg(opts,val,on){return h('div',{className:'seg full'},opts.map(([v,l])=>h('button',{type:'button','aria-pressed':String(String(val)===String(v)),onclick:e=>{[...e.currentTarget.parentNode.children].forEach(x=>x.setAttribute('aria-pressed','false'));e.currentTarget.setAttribute('aria-pressed','true');on(v)}},l)))}
function linkField(val,on){const pages=site.pages.map(p=>['page:'+p.id,'Page: '+p.name]);const anchors=page.blocks.filter(b=>b.style.anchor).map(b=>['#'+b.style.anchor,'Section: '+BLOCKS[b.type].name+' (#'+b.style.anchor+')']);const known=['',...pages.map(x=>x[0]),...anchors.map(x=>x[0])].includes(val||'');
 const inp=h('input',{type:'text',value:known?'':val,placeholder:'https://… or tel:… or mailto:…',ariaLabel:'Web address',hidden:known,oninput:e=>on(e.target.value)});
 const s=h('select',{ariaLabel:'Link destination',onchange:e=>{if(e.target.value==='__url'){inp.hidden=false;inp.focus()}else{inp.hidden=true;on(e.target.value)}}},h('option',{value:'',selected:!val},'No link'),[...pages,...anchors].map(([v,l])=>h('option',{value:v,selected:val===v},l)),h('option',{value:'__url',selected:!known},'Web address, phone or email'));return h('div',{className:'f'},s,inp)}
function imgField(f,b,path,obj){const val=getP(b.props,path);const base=baseCtx(site,page,'edit');const th=h('button',{type:'button',className:'th',ariaLabel:'Change image',onclick:pick},val?h('img',{src:base.src(val),alt:''}):null);function pick(){openMedia(getP(b.props,path),v=>setField(b,path,v,{inspector:true}))}
 const wrap=h('div',{className:'f'},h('div',{className:'fl'},f.label),h('div',{className:'imgf'},th,h('div',{className:'ac'},h('button',{type:'button',className:'btn',onclick:pick},val?'Change':'Add image'),f.optional&&val?h('button',{type:'button',className:'btn',onclick:()=>setField(b,path,'',{inspector:true})},'Remove'):null)));
 if(f.alt){const ap=path.replace(/[^.]+$/,'')+f.alt;wrap.append(h('input',{type:'text',placeholder:'Describe the picture for screen readers',ariaLabel:'Image description',value:getP(b.props,ap)||'',oninput:e=>setField(b,ap,e.target.value,{key:'a'+ap})}))}return wrap}
function fieldEl(f,b,prefix,obj){
 if(f.when&&!f.when(obj))return null;const path=prefix?prefix+'.'+f.k:f.k,val=getP(b.props,path),ty=f.type||'text';const id='f-'+b.id+'-'+path.replace(/\./g,'-');
 const hint=f.hint?h('div',{className:'hint'},f.hint):null;
 if(ty==='text'||ty==='textarea'||ty==='code'){const on=e=>setFieldQuiet(b,path,e.target.value);const i=ty==='text'?h('input',{type:'text',id,value:val??'',oninput:on}):h('textarea',{id,value:val??'',className:ty==='code'?'code':'',oninput:on,spellcheck:ty!=='code'});i.dataset.path=path;return h('div',{className:'f'},h('label',{htmlFor:id},f.label),i,hint)}
 if(ty==='toggle')return h('label',{className:'tog'},f.label,h('input',{type:'checkbox',checked:!!val,onchange:e=>setField(b,path,e.target.checked)}));
 if(ty==='select'){const on=v=>setField(b,path,v,{inspector:f.k==='variant'||f.k==='kind'||f.k==='ratio'});return f.options.length<=3||(f.options.length===4&&f.options.every(o=>o[1].length<9))?h('div',{className:'f'},h('div',{className:'fl'},f.label),seg(f.options,val,on)):h('div',{className:'f'},h('label',{htmlFor:id},f.label),h('select',{id,onchange:e=>on(e.target.value)},f.options.map(([v,l])=>h('option',{value:v,selected:String(val)===String(v)},l))))}
 if(ty==='range')return rangeF(f.label,val,f.min,f.max,v=>setField(b,path,v,{key:'r'+path}),f.unit??'px',f.step||1);
 if(ty==='color'){const ok=/^#[0-9a-f]{6}$/i.test(val||'');return h('div',{className:'colr'},h('input',{type:'color',id,value:ok?val:site.theme.accent,oninput:e=>setField(b,path,e.target.value,{key:'c'+path})}),h('label',{htmlFor:id},f.label),ok&&!f.required?h('button',{type:'button',className:'btn',style:'padding:3px 8px;font-size:11.5px',onclick:()=>setField(b,path,'',{inspector:true}),title:'Use the theme accent'},'Theme'):h('span',{className:'chip ok'},'Theme'))}
 if(ty==='link')return h('div',{className:'f'},h('div',{className:'fl'},f.label),linkField(val,v=>setField(b,path,v,{key:'l'+path})));
 if(ty==='button'){val||setP(b.props,path,{label:'',link:''});const v2=getP(b.props,path);const ti=h('input',{type:'text',value:v2.label,placeholder:'Leave empty to hide',ariaLabel:f.label+' text',oninput:e=>setField(b,path+'.label',e.target.value,{key:'b'+path})});ti.dataset.path=path+'.label';return h('div',{className:'f'},h('div',{className:'fl'},f.label),ti,linkField(v2.link,v=>setField(b,path+'.link',v,{key:'bl'+path})))}
 if(ty==='image')return imgField(f,b,path,obj);
 if(ty==='list')return listField(f,b,path,val);
}
function setFieldQuiet(b,path,v){setP(b.props,path,v);rerenderBlock(b.id);touch('f'+path)}
function listField(f,b,path,arr){const box=h('div',{className:'list'});arr=arr||[];
 arr.forEach((it,i)=>{const ip=path+'.'+i;const title=(f.itemLabel&&it[f.itemLabel])||((f.itemFallback||'Item')+' '+(i+1));
  const act=(ic,lab,fn,dis)=>h('button',{type:'button',className:'ib',title:lab,ariaLabel:lab,disabled:dis,html:ico(ic),onclick:e=>{e.preventDefault();e.stopPropagation();fn()}});
  const mv=d=>{const[x]=arr.splice(i,1);arr.splice(i+d,0,x);openItems.delete(ip);setField(b,path,arr,{inspector:true})};
  const body=h('div',{});f.fields.forEach(x=>{const e=fieldEl(x,b,ip,it);if(e)body.append(e)});
  const d=h('details',{className:'item',open:openItems.has(ip),ontoggle:e=>{e.target.open?openItems.add(ip):openItems.delete(ip)}},h('summary',{},h('span',{},String(title)),act('up','Move up',()=>mv(-1),i===0),act('down','Move down',()=>mv(1),i===arr.length-1),act('copy','Duplicate',()=>{arr.splice(i+1,0,clone(it));setField(b,path,arr,{inspector:true})}),act('trash','Remove',()=>{arr.splice(i,1);setField(b,path,arr,{inspector:true})})),body);box.append(d)});
 box.append(h('button',{type:'button',className:'btn',onclick:()=>{arr.push(clone(f.def));openItems.add(path+'.'+(arr.length-1));setField(b,path,arr,{inspector:true})},html:ico('plus')+'Add'}));
 return h('div',{className:'f'},h('div',{className:'fl'},f.label),box)}
function renderInspector(){const el=$('#insp'),sc=el.scrollTop;el.innerHTML='';const b=selBlock();
 if(!b){const n=page.blocks.length,w=site.pages.reduce((a,p)=>a+p.blocks.length,0);el.append(phead('Nothing selected'));el.append(h('div',{className:'pb'},h('p',{className:'note'},'Click any block on the page to change it. Click text on the page to type straight into it.'),h('div',{className:'files'},h('div',{},h('span',{},'This page'),h('span',{},n+' blocks')),h('div',{},h('span',{},'Whole site'),h('span',{},site.pages.length+' pages, '+w+' blocks'))),
   h('div',{className:'f'},h('div',{className:'lbl'},'Shortcuts'),h('div',{className:'note',html:'Ctrl Z undo · Ctrl Y redo<br>Ctrl D duplicate · Delete remove<br>Alt ↑ ↓ move · Esc deselect'}))));return}
 const d=BLOCKS[b.type];el.append(h('div',{className:'ph'},h('h2',{},d.name),h('button',{type:'button',className:'ib',ariaLabel:'Deselect',title:'Deselect',html:ico('x'),onclick:()=>{select(null);closeSheet()}})));
 el.append(h('div',{className:'tabs'},[['content','Content'],['style','Style']].map(([k,l])=>h('button',{type:'button','aria-pressed':String(insTab===k),onclick:()=>{insTab=k;renderInspector()}},l))));
 const body=h('div',{className:'pb',style:'padding-top:12px'});
 if(insTab==='content'){d.fields.forEach(f=>{const e=fieldEl(f,b,'',b.props);if(e)body.append(e)});if(sampleFn&&!d.global&&b.type!=='embed'&&b.type!=='spacer'&&b.type!=='image')body.append(aiBox(b))}else styleTab(b,body);
 el.append(body);el.scrollTop=sc}
function styleTab(b,box){const s=b.style,glob=BLOCKS[b.type].global;const up=(k,v)=>{s[k]=v;rerenderBlock(b.id);touch('s'+k)};const row=(lab,o,val,k)=>h('div',{className:'f'},h('div',{className:'fl'},lab),seg(o,val,v=>up(k,v)));
 box.append(row('Background',[['default','Page'],['tint','Tint'],['accent','Accent'],['ink','Dark']],s.tone||'default','tone'));
 if(!glob||b.type==='footer')box.append(row('Height',[['0','None'],['s','S'],['m','M'],['l','L']],s.pad||(b.type==='footer'?'m':'m'),'pad'));
 if(!glob){box.append(row('Width',[['n','Narrow'],['x','Normal'],['w','Wide'],['f','Full']],s.width||'x','width'),row('Align',[['l','Left'],['c','Centre']],s.align||'l','align'),row('Show on',[['','All'],['d','Desktop'],['m','Phone']],s.show||'','show'));
  const fake={label:'Background image',optional:1};box.append(bgField(b,fake));if(s.bg||(b.type==='hero'&&b.props.variant==='cover'))box.append(rangeF('Darken image',s.overlay??60,0,85,v=>up('overlay',v),'%'));
  box.append(row('Slanted edge',[['','None'],['t','Top'],['b','Bottom'],['tb','Both']],s.ang||'','ang'));
  box.append(decoField(b));
  box.append(h('div',{className:'f'},h('label',{htmlFor:'anchor-in'},'Section name for links'),h('input',{type:'text',id:'anchor-in',value:s.anchor||'',placeholder:'menu',oninput:e=>{const v=e.target.value?slugify(e.target.value):'';s.anchor=v;touch('anc')}}),h('div',{className:'hint'},'Name a section and buttons can jump straight to it.')))}}
function decoField(b){const s=b.style,val=s.deco;const base=baseCtx(site,page,'edit');const re=()=>{rerenderBlock(b.id);touch('deco');};const pick=()=>openMedia(val,v=>{s.deco=v;re();renderInspector()});
 const wrap=h('div',{className:'f'},h('div',{className:'fl'},'Peeking image'),h('div',{className:'imgf'},h('button',{type:'button',className:'th',ariaLabel:'Choose peeking image',onclick:pick},val?h('img',{src:base.src(val),alt:''}):null),h('div',{className:'ac'},h('button',{type:'button',className:'btn',onclick:pick},val?'Change':'Add image'),val?h('button',{type:'button',className:'btn',onclick:()=>{delete s.deco;re();renderInspector()}},'Remove'):null)),h('div',{className:'hint'},'A cut-out picture, such as a mascot, that pokes in from the side of this section.'));
 if(val){const sg=(lab,o,v,k)=>h('div',{className:'f'},h('div',{className:'fl'},lab),seg(o,v,x=>{s[k]=x;re()}));wrap.append(sg('Side',[['l','Left'],['r','Right']],s.decoX||'r','decoX'),sg('Height',[['t','Top'],['m','Middle'],['b','Bottom']],s.decoY||'m','decoY'),rangeF('Size',s.decoSize||170,60,420,v=>{s.decoSize=v;re()}),rangeF('Hidden off the edge',s.decoPeek??30,0,70,v=>{s.decoPeek=v;re()},'%'),h('label',{className:'tog'},'Hide on phones',h('input',{type:'checkbox',checked:s.decoHide!==false,onchange:e=>{s.decoHide=e.target.checked;re()}})))}
 return wrap}
function bgField(b,f){const s=b.style,val=s.bg;const base=baseCtx(site,page,'edit');const pick=()=>openMedia(val,v=>{s.bg=v;rerenderBlock(b.id);touch();renderInspector()});return h('div',{className:'f'},h('div',{className:'fl'},f.label),h('div',{className:'imgf'},h('button',{type:'button',className:'th',ariaLabel:'Choose background image',onclick:pick},val?h('img',{src:base.src(val),alt:''}):null),h('div',{className:'ac'},h('button',{type:'button',className:'btn',onclick:pick},val?'Change':'Add image'),val?h('button',{type:'button',className:'btn',onclick:()=>{delete s.bg;rerenderBlock(b.id);touch();renderInspector()}},'Remove'):null)))}

/* ---------- Claude features ---------- */
let sampleFn=null,dlCap=null,assetsCap=null,dbCol=null;
function aiBox(b){const ta=h('textarea',{id:'ai-'+b.id,placeholder:'Make this friendlier and shorter',ariaLabel:'What should Claude change?',style:'min-height:48px'});const go=h('button',{type:'button',className:'btn p w',html:ico('spark')+'Rewrite this block',onclick:async()=>{const ask=ta.value.trim()||'Make the wording clearer and more specific.';go.disabled=true;go.innerHTML='<span class="spin"></span> Rewriting';try{const prompt=`You rewrite website copy. Site: "${site.name}". Block type: ${b.type}. Instruction: ${ask}\nBlock content as JSON:\n${JSON.stringify(strip(b.props))}\nReturn only JSON with exactly the same keys and array lengths, changing only human-readable text. Use Australian English. Do not invent customer quotes, prices, phone numbers or awards.`;const out=await sampleFn.json(prompt,{modelTier:'quick'});mergeText(b.props,out);rerenderBlock(b.id);touch();renderInspector();toast('Block rewritten. Press Undo to go back.')}catch(e){toast(e.code==='rate_limited'?'Claude is busy. Try again in a minute.':'Claude could not rewrite that block. Try a shorter instruction.');go.disabled=false;go.innerHTML=ico('spark')+'Rewrite this block'}}});return h('div',{className:'ai'},h('div',{className:'lbl'},'Ask Claude'),ta,go)}
function strip(o){if(Array.isArray(o))return o.map(strip);if(o&&typeof o==='object'){const r={};for(const k in o){if(['image','alt','link','logo','color','action','nlAction'].includes(k))continue;r[k]=strip(o[k])}return r}return o}
function mergeText(t,s){for(const k in t){if(typeof t[k]==='string'&&typeof s?.[k]==='string'&&!['image','link','variant','cols','ratio','kind','color','look','shape','layout','fit','action','email','nlAction'].includes(k))t[k]=s[k];else if(t[k]&&typeof t[k]==='object'&&s?.[k]&&typeof s[k]==='object')mergeText(t[k],s[k])}}
function fillDefaults(def,got){const out=clone(def);for(const k in def){const d=def[k],v=got?.[k];if(v==null)continue;if(Array.isArray(d)){if(!Array.isArray(v))continue;const proto=d[0]||{};out[k]=v.slice(0,12).map((x,i)=>(typeof proto==='object'?fillDefaults(d[i%d.length]||proto,x):x))}else if(d&&typeof d==='object')out[k]=fillDefaults(d,v);else if(k==='image')out[k]=/^art:\d+$/.test(v)?v:d;else if(typeof d==='boolean')out[k]=!!v;else if(typeof d==='number')out[k]=+v||d;else out[k]=String(v)}return out}
async function generateSite(desc){const types=Object.entries(BLOCKS).filter(([k,d])=>!d.global&&!['columns','embed','video','spacer','image'].includes(k)).map(([k,d])=>`${k}: ${d.desc}. props ${JSON.stringify(d.def)}`).join('\n');
 const prompt=`You design small business websites. Plan a site for this request:\n"""${desc}"""\n\nAvailable blocks:\n${types}\n\nImages: use "art:0" to "art:11" only. Links in button "link" fields may be a page name in lower case, or empty.\nThemes: ${Object.keys(THEMES).join(', ')}.\nReturn JSON only: {"name":string,"theme":string,"logoText":string,"footerText":string,"pages":[{"name":string,"title":string,"desc":string,"blocks":[{"type":string,"tone":"default|tint|accent|ink","props":{...}}]}]}\nRules: 1 to 4 pages. Home has 5 to 8 blocks and starts with hero. Write specific, plain Australian English copy. Never invent customer quotes, reviews, awards, staff names, prices or contact details: use clear placeholders such as "Customer name", "$00", "0400 000 000" and "hello@example.com" and keep the default testimonial text.`;
 const o=await sampleFn.json(prompt,{modelTier:'default'});const s=fromStarter('blank');s.name=String(o.name||'New site').slice(0,80);const th=THEMES[o.theme]?o.theme:'harbour';s.theme={...THEMES[th],preset:th};s.header.props.logoText=o.logoText||s.name;s.footer.props.logoText=s.name;if(o.footerText)s.footer.props.text=String(o.footerText);
 s.pages=(o.pages||[]).slice(0,6).map(p=>({id:uid(),name:String(p.name||'Page'),slug:slugify(p.name),title:String(p.title||''),desc:String(p.desc||''),inNav:true,blocks:(p.blocks||[]).filter(b=>BLOCKS[b.type]&&!BLOCKS[b.type].global).map(b=>{const n=mkBlock(b.type);n.props=fillDefaults(BLOCKS[b.type].def,b.props);if(['tint','accent','ink','default'].includes(b.tone))n.style.tone=b.tone;return n})}));
 if(!s.pages.length||!s.pages[0].blocks.length)throw new Error('empty');const names={};s.pages.forEach(p=>{names[p.slug]='page:'+p.id;names[p.name.toLowerCase()]='page:'+p.id});const fix=x=>{if(Array.isArray(x))x.forEach(fix);else if(x&&typeof x==='object')for(const k in x){if(k==='link')x[k]=names[String(x[k]).toLowerCase()]||(/^#|^https?:|^tel:|^mailto:/.test(x[k])?x[k]:'');else fix(x[k])}};fix(s.pages);return s}

/* ---------- Modals ---------- */
function modal(title,build,small){const m=h('div',{className:'modal',onmousedown:e=>{if(e.target===m)close()}});const close=()=>{m.remove();removeEventListener('keydown',k,true)};const k=e=>{if(e.key==='Escape'){e.stopPropagation();close()}};addEventListener('keydown',k,true);const b=h('div',{className:'db'});const d=h('div',{className:'dlg'+(small?' sm':''),role:'dialog','aria-modal':'true','aria-label':title},h('div',{className:'dh'},h('h2',{},title),h('button',{type:'button',className:'ib',ariaLabel:'Close',html:ico('x'),onclick:close})),b);m.append(d);$('#modals').append(m);build(b,close);return close}
function confirmDo(title,text,yes,fn){modal(title,(b,c)=>{b.append(h('p',{className:'note'},text),h('div',{className:'acts'},h('button',{type:'button',className:'btn danger',onclick:()=>{c();fn()}},yes),h('button',{type:'button',className:'btn',onclick:c},'Keep it')))},true)}
function openMedia(cur,pick){modal('Choose an image',(b,close)=>{const file=h('input',{type:'file',accept:'image/*',multiple:true,hidden:true,onchange:e=>up(e.target.files)});
 const status=h('span',{className:'note'},'JPG, PNG or WebP. Large photos are resized to 1800 px.');const dz=h('div',{className:'drop'},h('button',{type:'button',className:'btn p',onclick:()=>file.click()},'Upload from your device'),status,file);
 ['dragover','dragenter'].forEach(n=>dz.addEventListener(n,e=>{e.preventDefault();dz.classList.add('over')}));dz.addEventListener('dragleave',()=>dz.classList.remove('over'));dz.addEventListener('drop',e=>{e.preventDefault();dz.classList.remove('over');up(e.dataTransfer.files)});
 async function up(files){const fs=[...files].filter(f=>f.type.startsWith('image/'));if(!fs.length)return;status.innerHTML='<span class="spin"></span> Adding your images';let last;for(const f of fs){try{last=await addMedia(f)}catch{toast('Could not read '+f.name+'. Try a JPG or PNG.')}}renderGrid();if(fs.length===1&&last){pick('media:'+last);close()}else status.textContent='Added. Pick one below.'}
 const mine=h('div',{className:'pgrid'});function renderGrid(){mine.innerHTML='';const base=baseCtx(site,page,'edit');Object.keys(site.media||{}).forEach(id=>mine.append(h('button',{type:'button',ariaLabel:'Use this image',onclick:()=>{pick('media:'+id);close()}},h('img',{src:base.src('media:'+id),alt:''}))));minew.hidden=!mine.children.length}
 const minew=h('div',{className:'f'},h('div',{className:'lbl'},'Your images'),mine);
 const arts=h('div',{className:'pgrid'});for(let i=0;i<ART_COUNT;i++)arts.append(h('button',{type:'button',ariaLabel:'Artwork '+(i+1),onclick:()=>{pick('art:'+i);close()}},h('img',{src:artURI(i,site.theme),alt:''})));
 const url=h('input',{type:'url',placeholder:'https://example.com/photo.jpg',ariaLabel:'Image web address'});
 b.append(dz,minew,h('div',{className:'f'},h('div',{className:'lbl'},'Artwork in your theme colours'),arts),h('div',{className:'f'},h('div',{className:'lbl'},'From a web address'),h('div',{style:'display:flex;gap:8px'},url,h('button',{type:'button',className:'btn',onclick:()=>{if(/^https?:/.test(url.value)){pick(url.value.trim());close()}else toast('Enter an address starting with https://')}},'Use')),h('div',{className:'hint note'},'Images from other websites show on your published site, with a stand-in here while you edit.')));renderGrid()})}
async function addMedia(file,target=site,max=1800){const img=await createImageBitmap(file);const k=Math.min(1,max/Math.max(img.width,img.height));const c=document.createElement('canvas');c.width=Math.round(img.width*k);c.height=Math.round(img.height*k);c.getContext('2d').drawImage(img,0,0,c.width,c.height);const blob=await new Promise(r=>c.toBlob(r,'image/webp',.82));const id=uid();target.media=target.media||{};
 if(assetsCap){try{const a=await assetsCap.upload(blob);target.media[id]={url:a.url,assetId:a.id,w:c.width,h:c.height};if(target===site)scheduleSave();return id}catch{}}
 const data=await new Promise(r=>{const f=new FileReader();f.onload=()=>r(f.result);f.readAsDataURL(blob)});target.media[id]={data,w:c.width,h:c.height};if(target===site)scheduleSave();return id}
function openSites(){modal('Your sites',(b,close)=>{
 if(sampleFn){const ta=h('textarea',{id:'gen-desc',placeholder:'A mobile dog groomer in Launceston. Friendly, with prices and a booking form.',ariaLabel:'Describe your site'});const go=h('button',{type:'button',className:'btn p',html:ico('spark')+'Build it for me',onclick:async()=>{if(!ta.value.trim()){ta.focus();return}go.disabled=true;go.innerHTML='<span class="spin"></span> Claude is planning your site';try{const s=await generateSite(ta.value.trim());await flushSave();openSite(s);close();toast('Site built. Check the placeholders before you publish.')}catch(e){toast(e.code==='rate_limited'?'Claude is busy. Try again in a minute.':'That did not work. Try describing it again in a sentence or two.');go.disabled=false;go.innerHTML=ico('spark')+'Build it for me'}}});b.append(h('div',{className:'ai'},h('div',{className:'lbl'},'Describe a site and Claude will draft it'),ta,h('div',{},go)))}
 const cards=h('div',{className:'cards'});Object.entries(STARTERS).forEach(([k,t])=>{const th=THEMES[t.theme];cards.append(h('button',{type:'button',className:'st',onclick:()=>openSetup(k,close),html:`<span class="art" style="background-image:url(&quot;${artURI(k==='blank'?2:{bakery:7,trades:3,photo:4,yoga:1,learning:13}[k],th)}&quot;)"></span><span class="tx"><b>${esc(k==='blank'?'Blank site':t.kind)}</b><small>${esc(k==='blank'?'One page and a hero':t.name)}</small></span>`}))});
 b.append(h('div',{className:'f'},h('div',{className:'lbl'},'Start from a template'),cards));
 const list=h('div',{className:'sl'});b.append(h('div',{className:'f'},h('div',{className:'lbl'},'Saved sites'),list));
 const importIn=h('input',{type:'file',accept:'.json,application/json',hidden:true,onchange:async e=>{try{const o=JSON.parse(await e.target.files[0].text());const s=checkSite(o);s.id=uid();openSite(s);close();toast('Site imported')}catch{toast('That file is not a Trestle backup.')}}});b.append(h('div',{className:'acts'},h('button',{type:'button',className:'btn',onclick:()=>importIn.click()},'Import a backup'),importIn));
 (async()=>{await flushSave();const all=(await idbAll()).filter(x=>x.id).sort((a,c)=>c.updatedAt-a.updatedAt);list.innerHTML='';all.forEach(s=>{const when=new Date(s.updatedAt).toLocaleString('en-AU',{dateStyle:'medium',timeStyle:'short'});list.append(h('div',{className:'sr'+(s.id===site.id?' on':'')},h('button',{type:'button',className:'mid',onclick:()=>{if(s.id!==site.id)openSite(s);close()}},h('b',{},s.name),h('small',{},s.pages.length+' pages · '+when)),s.id===site.id?h('span',{className:'chip ok'},'Open'):h('button',{type:'button',className:'ib',title:'Delete site',ariaLabel:'Delete '+s.name,html:ico('trash'),onclick:()=>confirmDo('Delete “'+s.name+'”?','This removes the site for good.','Delete site',async()=>{await idbDel(s.id);dbCol?.doc('site_'+s.id).delete().catch(()=>{});close();openSites()})})))})})();
})}
/* ---------- Template setup: ask for the business details, then fill the template with them ---------- */
async function logoColour(file){try{const img=await createImageBitmap(file);const c=document.createElement('canvas');const k=Math.min(1,96/Math.max(img.width,img.height));c.width=Math.max(1,Math.round(img.width*k));c.height=Math.max(1,Math.round(img.height*k));const x=c.getContext('2d');x.drawImage(img,0,0,c.width,c.height);const d=x.getImageData(0,0,c.width,c.height).data;const bins={};
 for(let i=0;i<d.length;i+=4){if(d[i+3]<160)continue;const r=d[i]/255,g=d[i+1]/255,b=d[i+2]/255,mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2,s=mx===mn?0:(mx-mn)/(1-Math.abs(2*l-1));if(s<.32||l<.12||l>.9)continue;let hue=mx===mn?0:mx===r?((g-b)/(mx-mn))%6:mx===g?(b-r)/(mx-mn)+2:(r-g)/(mx-mn)+4;const key=Math.round(((hue*60+360)%360)/20);const e=bins[key]||(bins[key]={n:0,r:0,g:0,b:0});e.n+=s;e.r+=d[i]*s;e.g+=d[i+1]*s;e.b+=d[i+2]*s}
 const best=Object.values(bins).sort((p,q)=>q.n-p.n)[0];if(!best||best.n<8)return null;return '#'+[best.r,best.g,best.b].map(v=>Math.round(v/best.n).toString(16).padStart(2,'0')).join('')}catch{return null}}
function fitAccent(t,col){let a=col;for(let i=0;i<8&&contrast(a,t.bg)<3;i++)a=mix(a,t.text,.18);return a}
function personalise(s,key,info){const st=STARTERS[key];const swaps=[];
 const name=info.name.trim();if(name){[st.name,st.header?.logoText].filter(Boolean).sort((x,y)=>y.length-x.length).forEach(o=>swaps.push([o,name]))}
 if(info.place&&st.place)swaps.push([st.place,info.place]);
 if(info.phone){swaps.push(['tel:0400000000','tel:'+info.phone.replace(/[^\d+]/g,'')],['0400 000 000',info.phone])}
 if(info.email){swaps.push(['mailto:hello@example.com','mailto:'+info.email],['hello@example.com',info.email])}
 if(info.address)swaps.push(['Your street, your suburb',info.address]);
 const walk=o=>{if(Array.isArray(o))return o.map(walk);if(o&&typeof o==='object'){for(const k in o)if(k!=='image'&&k!=='bg'&&k!=='id')o[k]=walk(o[k]);return o}if(typeof o==='string'){let v=o;swaps.forEach(([f,t])=>{v=v.split(f).join(t)});return v}return o};
 walk(s.pages);walk(s.header.props);walk(s.footer.props);
 if(name){s.name=name;s.header.props.logoText=info.logoOnly&&info.logo?'':name;s.header.props.logoAlt=name;s.footer.props.logoText=name}
 if(info.logo)s.header.props.logo='media:'+info.logo;
 if(info.tagline){s.footer.props.text=info.tagline;if(!s.pages[0].desc||s.pages[0].desc===st.pages[0].desc)s.pages[0].desc=info.tagline}
 const where=info.address||info.place;if(where)s.pages.forEach(p=>p.blocks.forEach(b=>{if(b.type==='map')b.props.address=where}));
 s.pages.forEach(p=>{if(!p.title)p.title=p===s.pages[0]?name:p.name+' | '+name});
 if(info.accent){s.theme.accent=fitAccent(s.theme,info.accent);s.theme.preset=''}return s}
function openSetup(key,closeSites){const st=STARTERS[key];const draft=fromStarter(key);const info={name:'',logo:null,logoOnly:false,accent:null,useColour:true,place:'',phone:'',email:'',address:'',tagline:''};let logoCol=null;
 modal(key==='blank'?'Set up your site':'Set up: '+st.kind,(b,close)=>{const t=draft.theme;
  const pv=h('div',{style:`display:flex;align-items:center;gap:12px;padding:14px 18px;border-radius:9px;border:1px solid var(--line);background:${t.bg};color:${t.text};font:700 19px/1.1 '${t.head}',Georgia,serif;min-height:66px;overflow:hidden`});
  const paint=()=>{pv.innerHTML='';pv.style.background=draft.theme.bg;const base=baseCtx(draft,draft.pages[0],'edit');if(info.logo)pv.append(h('img',{src:base.src('media:'+info.logo),alt:'',style:'height:38px;width:auto;max-width:180px;object-fit:contain'}));if(!(info.logo&&info.logoOnly))pv.append(h('span',{style:'overflow:hidden;text-overflow:ellipsis;white-space:nowrap'},info.name||st.header?.logoText||'Your business'));const acc=info.logo&&info.useColour&&logoCol?fitAccent(draft.theme,logoCol):draft.theme.accent;pv.append(h('span',{style:'flex:1'}),h('span',{style:`background:${acc};color:${onColor(acc)};font:700 13px system-ui;padding:8px 12px;border-radius:${draft.theme.radius}px;white-space:nowrap`},'Button'))};
  const fld=(lab,k,ph,hint,type='text')=>{const id='setup-'+k;return h('div',{className:'f'},h('label',{htmlFor:id},lab),h('input',{type,id,placeholder:ph,value:info[k],oninput:e=>{info[k]=e.target.value;if(k==='name')paint()}}),hint?h('div',{className:'hint'},hint):null)};
  const nameF=fld('Business name','name',st.header?.logoText&&key!=='blank'?'e.g. '+st.name:'e.g. Harbourside Dental');
  const file=h('input',{type:'file',accept:'image/*',hidden:true,onchange:async e=>{const f=e.target.files[0];if(!f)return;up.disabled=true;up.innerHTML='<span class="spin"></span> Adding logo';try{info.logo=await addMedia(f,draft,600);logoCol=await logoColour(f);colRow.hidden=!logoCol;if(logoCol)sw.style.background=logoCol;onlyRow.hidden=false;rm.hidden=false;paint()}catch{toast('Could not read that image. Try a PNG or JPG.')}up.disabled=false;up.textContent=info.logo?'Change logo':'Upload logo'}});
  const up=h('button',{type:'button',className:'btn',onclick:()=>file.click()},'Upload logo');
  const rm=h('button',{type:'button',className:'btn',hidden:true,onclick:()=>{if(info.logo)delete draft.media[info.logo];info.logo=null;logoCol=null;colRow.hidden=true;onlyRow.hidden=true;rm.hidden=true;up.textContent='Upload logo';paint()}},'Remove');
  const sw=h('span',{style:'width:16px;height:16px;border-radius:4px;display:inline-block;border:1px solid var(--line);vertical-align:-3px;margin-right:6px'});
  const colRow=h('label',{className:'tog',hidden:true},h('span',{},sw,'Match the theme to my logo colour'),h('input',{type:'checkbox',checked:true,onchange:e=>{info.useColour=e.target.checked;paint()}}));
  const onlyRow=h('label',{className:'tog',hidden:true},'My logo already includes the name',h('input',{type:'checkbox',onchange:e=>{info.logoOnly=e.target.checked;paint()}}));
  const more=h('details',{className:'item'},h('summary',{style:'padding:9px 10px'},h('span',{},'Contact details (optional)')),h('div',{style:'padding:10px'},fld('One line about what you do','tagline','Family-run bakery in Hobart since 2009','Used in the footer and for Google.'),fld(st.place?'Town or suburb':'Town or suburb','place',st.place||'Launceston',st.place?'Replaces “'+st.place+'” in the template.':''),fld('Phone','phone','0400 000 000','','tel'),fld('Email','email','hello@yourbusiness.com.au','','email'),fld('Street address','address','12 Main Street, Launceston TAS')));
  const go=async(skip)=>{if(!skip&&!info.name.trim()){toast('Add your business name, or choose Use sample content.');$('#setup-name')?.focus();return}if(!skip)personalise(draft,key,{...info,accent:info.logo&&info.useColour?logoCol:null});await flushSave();openSite(draft);close();closeSites();toast(skip?'Template opened with sample content':'Your site is ready. Click anything to change it.')};
  b.append(h('p',{className:'note'},'We’ll put these into every page of the template. You can change anything afterwards.'),pv,nameF,h('div',{className:'f'},h('div',{className:'fl'},'Logo (optional)'),h('div',{className:'acts'},up,rm,file),h('div',{className:'hint'},'PNG with a transparent background works best.'),onlyRow,colRow),more,
   h('div',{className:'acts'},h('button',{type:'button',className:'btn p',onclick:()=>go(false)},'Create my site'),h('button',{type:'button',className:'btn',onclick:()=>go(true)},'Use sample content')));
  paint();setTimeout(()=>$('#setup-name')?.focus(),30);
  $('#setup-name').addEventListener('keydown',e=>{if(e.key==='Enter')go(false)})},true)}
function checkSite(o){if(!o||!Array.isArray(o.pages)||!o.pages.length||!o.header||!o.footer||!o.theme)throw 0;o.pages.forEach(p=>{p.id=p.id||uid();p.slug=slugify(p.slug||p.name);p.blocks=(p.blocks||[]).filter(b=>BLOCKS[b.type]&&b.props);p.blocks.forEach(b=>{b.id=b.id||uid();b.style=b.style||{}})});o.media=o.media||{};o.updatedAt=Date.now();return o}
function openSite(s){site=s;page=s.pages[0];sel=null;insertAt=null;try{localStorage.setItem('trestle.last',s.id)}catch{}histReset();renderAll();scheduleSave()}

/* ---------- Preview ---------- */
let pvShadow,pvPage;
function renderPreview(){pvShadow.innerHTML=`<style>${SITE_CSS}</style><div class="tr-site" style="${themeVars(site.theme)}">${pageHTML(site,pvPage,'preview')}</div>`;$('#pvscroll').scrollTop=0;$('#pvname').textContent=pvPage.name}
function openPreview(){const p=$('#preview');p.hidden=false;pvPage=page;if(!pvShadow){pvShadow=$('#pvhost').attachShadow({mode:'open'});pvShadow.addEventListener('click',e=>{const a=e.target.closest('a');if(!a)return;const pg=a.dataset.page;const hr=a.getAttribute('href')||'';if(pg){e.preventDefault();pvPage=site.pages.find(x=>x.id===pg);renderPreview()}else if(hr.startsWith('#')){e.preventDefault();if(hr.length>1)pvShadow.getElementById(hr.slice(1))?.scrollIntoView({behavior:'smooth'})}});pvShadow.addEventListener('submit',e=>{e.preventDefault();toast('Forms work on your published site.')})}setPvDevice(isPhone()?'phone':device);renderPreview()}
function setPvDevice(d){const w=d==='desktop'?0:WID[d];$('#pvframe').style.width=w?w+'px':'100%';[...$('#pvseg').children].forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.d===d)))}

/* ---------- Export ---------- */
function pageDoc(s,p,css,mf,opts={}){const base=baseCtx(s,p,'export',mf);const title=p.title||(p===s.pages[0]?s.name:p.name+' | '+s.name);const can=opts.url?opts.url.replace(/\/$/,'')+'/'+(p===s.pages[0]?'':base.fileOf(p)):'';
 return `<!doctype html>\n<html lang="en-AU">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<title>${esc(title)}</title>\n${p.desc?`<meta name="description" content="${esc(p.desc)}">\n`:''}<meta property="og:title" content="${esc(title)}">\n<meta property="og:type" content="website">\n${p.desc?`<meta property="og:description" content="${esc(p.desc)}">\n`:''}${can?`<link rel="canonical" href="${esc(can)}">\n`:''}<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link rel="stylesheet" href="${esc(fontsHref([s.theme.head,s.theme.body]))}">\n${opts.inline?`<style>${css}</style>`:'<link rel="stylesheet" href="styles.css">'}\n</head>\n<body>\n<div class="tr-site" style="${esc(themeVars(s.theme)).replace(/&#39;/g,"'")}">\n${pageHTML(s,p,'export',mf)}\n</div>\n</body>\n</html>\n`}
const CSS_OUT=()=>'html{scroll-behavior:smooth;scroll-padding-top:80px}body{margin:0}\n'+SITE_CSS;
const usedMedia=s=>{const str=JSON.stringify([s.pages,s.header,s.footer]);return [...new Set([...str.matchAll(/media:([a-z0-9]+)/g)].map(m=>m[1]))].filter(id=>s.media?.[id])};
async function mediaBlob(m){if(m.data){return await (await fetch(m.data)).blob().catch(()=>dataToBlob(m.data))}return await (await fetch(m.url)).blob()}
function dataToBlob(d){const[a,b]=d.split(',');const bin=atob(b),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return new Blob([u],{type:a.match(/:(.*?);/)[1]})}
async function buildFiles(url){const files=[],mf={};for(const id of usedMedia(site)){const m=site.media[id];try{const b=m.data?dataToBlob(m.data):await mediaBlob(m);const ext=(b.type.split('/')[1]||'webp').replace('jpeg','jpg');const name=`images/${id}.${ext}`;mf[id]=name;files.push({name,data:b,size:b.size})}catch{mf[id]=m.url||''}}
 const css=CSS_OUT();files.unshift({name:'styles.css',data:css,size:new Blob([css]).size});[...site.pages].reverse().forEach(p=>{const d=pageDoc(site,p,css,mf,{url});files.unshift({name:baseCtx(site,p,'export').fileOf(p),data:d,size:new Blob([d]).size})});
 if(url){const u=url.replace(/\/$/,'');const x=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${site.pages.map(p=>`<url><loc>${esc(u)}/${p===site.pages[0]?'':baseCtx(site,p,'export').fileOf(p)}</loc></url>`).join('\n')}\n</urlset>\n`;files.push({name:'sitemap.xml',data:x,size:x.length})}return files}
function auditSite(){const out=[];const walk=(o,fn,p='')=>{if(Array.isArray(o))o.forEach((x,i)=>walk(x,fn,p+'.'+i));else if(o&&typeof o==='object')for(const k in o)walk(o[k],fn,p?p+'.'+k:k);else fn(o,p)};let alt=0,ph=0,rev=0,blank=0;
 site.pages.forEach(pg=>{if(!pg.title&&!pg.desc)blank++;pg.blocks.forEach(b=>{const scan=(o)=>{if(Array.isArray(o))return o.forEach(scan);if(o&&typeof o==='object'){if('image' in o&&String(o.image).startsWith('media:')&&!o.alt)alt++;for(const k in o)scan(o[k])}else if(typeof o==='string'){if(/real customer said/.test(o))rev++;else if(/example\.com|0400 000 000|Customer name|Replace this|Your street|Write your story|\$00/.test(o))ph++}};scan(b.props)})});
 const art=/"(image|bg)":"art:/.test(JSON.stringify(site.pages));let nofm=0;site.pages.forEach(pg=>pg.blocks.forEach(b=>{if(b.type==='comments'&&b.props.form&&!b.props.action&&!b.props.email)nofm++}));if(site.footer.props.nl&&!site.footer.props.nlAction)nofm++;if(nofm)out.push(['warn',`${nofm} form${nofm>1?'s have':' has'} no service address, so ${nofm>1?'they':'it'} will be left off your site.`]);
 out.push(rev?['warn',`${rev} testimonial${rev>1?'s':''} still need a real customer quote.`]:['ok','No sample testimonials left.']);out.push(ph?['warn',`${ph} placeholder${ph>1?'s':''} left, such as phone numbers or sample text.`]:['ok','Contact details and text look filled in.']);if(art)out.push(['warn','Some pictures are theme artwork. Swap in your own photos where you can.']);out.push(alt?['warn',`${alt} uploaded image${alt>1?'s need':' needs'} a description for screen readers.`]:['ok','Uploaded images have descriptions.']);out.push(blank?['warn',`${blank} page${blank>1?'s have':' has'} no search engine title or description.`]:['ok','Every page has search engine details.']);return out}
function openExport(){modal('Export your website',(b,close)=>{const chk=h('div',{className:'chk'});auditSite().forEach(([s,t])=>chk.append(h('div',{},h('i',{style:`color:var(--${s==='ok'?'ok':'warn'})`},s==='ok'?'OK':'!!'),h('span',{},t))));
 const url=h('input',{type:'url',placeholder:'https://www.yourbusiness.com.au',ariaLabel:'Site address',value:site.url||'',oninput:e=>{site.url=e.target.value;scheduleSave();refresh()}});const fl=h('div',{className:'files'},h('div',{},'Working out file sizes…'));let tok=0;async function refresh(){const m=++tok;const f=await buildFiles(site.url);if(m!==tok)return;fl.innerHTML='';let t=0;f.forEach(x=>{t+=x.size;fl.append(h('div',{},h('span',{},x.name),h('span',{},kb(x.size))))});fl.append(h('div',{style:'font-weight:700;border-top:1px solid var(--line);padding-top:3px;margin-top:2px'},h('span',{},f.length+' files'),h('span',{},kb(t))))}refresh();
 const dl=h('button',{type:'button',className:'btn p',html:'Download website (.zip)',onclick:async()=>{dl.disabled=true;try{const f=await buildFiles(site.url);const z=new JSZip();f.forEach(x=>z.file(x.name,x.data));const blob=await z.generateAsync({type:'blob',compression:'DEFLATE'});await saveFile(slugify(site.name)+'-website.zip',blob);toast('Website downloaded')}catch(e){if(e?.code!=='declined')toast('The download did not start. Use Copy this page instead.')}dl.disabled=false}});
 const cp=h('button',{type:'button',className:'btn',onclick:async()=>{const mf={};const d=pageDoc(site,page,CSS_OUT(),mf,{inline:true});try{await navigator.clipboard.writeText(d);toast('Copied '+page.name+' as one HTML file')}catch{const t=h('textarea',{value:d,readOnly:true,className:'code',ariaLabel:'Page HTML'});b.append(t);t.select();toast('Press Ctrl C to copy the selected HTML')}}},'Copy this page as HTML');
 const bk=h('button',{type:'button',className:'btn',onclick:async()=>{try{await saveFile(slugify(site.name)+'-backup.json',JSON.stringify(site));toast('Backup saved')}catch(e){if(e?.code!=='declined')toast('The backup did not download.')}}},'Download a backup');
 b.append(h('div',{className:'f'},h('div',{className:'lbl'},'Before you publish'),chk),h('div',{className:'f'},h('label',{},'Your site address (optional)'),url,h('div',{className:'hint'},'Adds a sitemap for Google and tidy search links.')),h('div',{className:'f'},h('div',{className:'lbl'},'What you get'),fl),h('div',{className:'acts'},dl,cp,bk),h('p',{className:'note'},'The zip is a finished website made of plain HTML and CSS. Upload it to any static web host, such as Netlify, Cloudflare Pages or GitHub Pages, then point your domain at it.'))})}
async function saveFile(name,data){if(dlCap)return dlCap.save({filename:name,data});if(window.claude)throw {code:'unavailable'};const u=URL.createObjectURL(data instanceof Blob?data:new Blob([data]));const a=h('a',{href:u,download:name});a.click();setTimeout(()=>URL.revokeObjectURL(u),4000)}

/* ---------- Saving: this browser first, then your Claude account ---------- */
let idb;const idbOpen=()=>idb||(idb=new Promise((res,rej)=>{const r=indexedDB.open('trestle',1);r.onupgradeneeded=()=>{r.result.createObjectStore('sites',{keyPath:'id'});r.result.createObjectStore('kv')};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}));
const memSites=new Map();
async function idbPut(s){memSites.set(s.id,s);try{const d=await idbOpen();await new Promise((r,j)=>{const t=d.transaction('sites','readwrite');t.objectStore('sites').put(s);t.oncomplete=r;t.onerror=j})}catch{}}
async function idbDel(id){memSites.delete(id);try{const d=await idbOpen();await new Promise(r=>{const t=d.transaction('sites','readwrite');t.objectStore('sites').delete(id);t.oncomplete=r})}catch{}}
async function idbAll(){try{const d=await idbOpen();const a=await new Promise((r,j)=>{const q=d.transaction('sites').objectStore('sites').getAll();q.onsuccess=()=>r(q.result);q.onerror=j});const m=new Map(a.map(s=>[s.id,s]));memSites.forEach((v,k)=>m.set(k,v));return [...m.values()]}catch{return [...memSites.values()]}}
async function kvGet(k){try{const d=await idbOpen();return await new Promise(r=>{const q=d.transaction('kv').objectStore('kv').get(k);q.onsuccess=()=>r(q.result);q.onerror=()=>r(null)})}catch{return null}}
async function kvSet(k,v){try{const d=await idbOpen();d.transaction('kv','readwrite').objectStore('kv').put(v,k)}catch{}}
let saveT=null,cloudT=null;const setStatus=t=>{$('#status').textContent=t};
function scheduleSave(){setStatus('Saving…');clearTimeout(saveT);saveT=setTimeout(flushSave,700)}
async function flushSave(){clearTimeout(saveT);if(!site)return;site.updatedAt=Date.now();await idbPut(clone(site));try{localStorage.setItem('trestle.last',site.id)}catch{}if(dbCol){setStatus('Syncing…');clearTimeout(cloudT);cloudT=setTimeout(pushCloud,1500)}else setStatus('Saved in this browser')}
function cloudCopy(s){const c=clone(s);for(const k in c.media||{})if(c.media[k].data)delete c.media[k];return JSON.stringify(c)}
async function pushCloud(){try{const j=cloudCopy(site);await dbCol.doc('site_'+site.id).set({name:site.name,updatedAt:site.updatedAt,json:j});setStatus('Saved to your account')}catch(e){setStatus('Saved in this browser');console.warn('Cloud save failed',e)}}
function saveMine(){kvSet('mine',myBlocks);dbCol?.doc('myblocks').set({json:JSON.stringify(myBlocks)}).catch(()=>{})}
async function connect(){if(!window.claude?.use)return;
 claude.use('sample').then(s=>{if(s){sampleFn=s;renderInspector()}}).catch(()=>{});claude.use('downloads').then(d=>{dlCap=d}).catch(()=>{});claude.use('assets').then(a=>{assetsCap=a}).catch(()=>{});
 try{const[db,user]=await Promise.all([claude.use('db'),claude.use('user')]);if(!db||!user)return;const id=await user.id();if(!id)return;dbCol=db.collection('data/users/'+id);const snap=await dbCol.get();let changedCur=false;for(const d of snap.docs){const o=d.data();if(d.id==='myblocks'){if(!myBlocks.length&&o.json){myBlocks=JSON.parse(o.json);kvSet('mine',myBlocks);if(panel==='add')renderPanel()}continue}if(!o?.json)continue;const remote=JSON.parse(o.json);const mine=(await idbAll()).find(x=>x.id===remote.id);if(!mine||remote.updatedAt>mine.updatedAt){const merged={...remote,media:{...(mine?.media||{}),...(remote.media||{})}};await idbPut(merged);if(site.id===merged.id&&H.stack.length<=1){site=merged;page=site.pages[0];changedCur=true}}}
  if(fresh&&snap.docs.some(d=>d.id.startsWith('site_'))){const all=(await idbAll()).filter(s=>s.id!==site.id).sort((a,b)=>b.updatedAt-a.updatedAt);if(all[0]&&H.stack.length<=1){await idbDel(site.id);site=all[0];page=site.pages[0];changedCur=true}}
  if(changedCur){histReset();renderAll()}await flushSave()}catch(e){console.warn('Account sync unavailable',e)}}

/* ---------- Top bar ---------- */
function renderTop(){const t=$('#top');t.innerHTML='';
 const brand=h('button',{type:'button',className:'brand',title:'Your sites and templates',onclick:openSites,html:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 6h20"/><path d="M6 6 3 20M6 6l4 14M18 6l-4 14M18 6l3 14M4.6 13h3.2M16.2 13h3.2"/></svg><span class="hide-sm">Trestle</span>'});
 const nm=h('input',{id:'siteName',type:'text',ariaLabel:'Site name',value:site.name,oninput:e=>{site.name=e.target.value;touch('sn')}});
 const ps=h('select',{id:'pagePick',ariaLabel:'Current page',style:'width:auto;max-width:150px;font-weight:600',onchange:e=>goPage(e.target.value)},site.pages.map(p=>h('option',{value:p.id,selected:p===page},p.name)));
 const dev=h('div',{className:'seg',id:'devseg'},[['desktop','desk','Desktop'],['tablet','tab','Tablet'],['phone','ph','Phone']].map(([k,i,l])=>h('button',{type:'button',title:l,ariaLabel:l,'aria-pressed':String(device===k),html:ico(i),onclick:()=>{device=k;renderTop();sizeFrame()}})));
 t.append(brand,nm,h('span',{className:'sep'}),ps,dev,h('span',{className:'spacer'}),h('span',{id:'status'},'Saved'),h('button',{type:'button',className:'ib',id:'undoB',title:'Undo (Ctrl Z)',ariaLabel:'Undo',html:ico('undo'),onclick:undo}),h('button',{type:'button',className:'ib',id:'redoB',title:'Redo (Ctrl Y)',ariaLabel:'Redo',html:ico('redo'),onclick:redo}),h('button',{type:'button',className:'btn',onclick:openPreview,title:'Preview',html:ico('eye')+'<span class="hide-sm">Preview</span>'}),h('button',{type:'button',className:'btn p',onclick:openExport},'Export'));renderTopState()}
function renderTopState(){const u=$('#undoB'),r=$('#redoB');if(u)u.disabled=H.i<=0;if(r)r.disabled=H.i>=H.stack.length-1}
function renderAll(){renderTop();renderRail();renderPanel();renderCanvas();renderInspector()}

/* ---------- Boot ---------- */
addEventListener('keydown',e=>{const t=e.composedPath()[0];const typing=t.isContentEditable||/INPUT|TEXTAREA|SELECT/.test(t.tagName);const mod=e.ctrlKey||e.metaKey;if(!$('#preview').hidden&&e.key==='Escape'){$('#preview').hidden=true;return}if($('#modals').children.length||typing)return;
 if(mod&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo()}else if(mod&&e.key.toLowerCase()==='y'){e.preventDefault();redo()}else if(!sel||BLOCKS[selBlock()?.type]?.global){if(e.key==='Escape')select(null)}else if(mod&&e.key.toLowerCase()==='d'){e.preventDefault();dupBlock(sel)}else if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();delBlock(sel)}else if(e.altKey&&e.key==='ArrowUp'){e.preventDefault();blockAct('up',sel)}else if(e.altKey&&e.key==='ArrowDown'){e.preventDefault();blockAct('down',sel)}else if(e.key==='Escape')select(null)});
addEventListener('resize',()=>{sizeFrame();renderRail()});
let fresh=false;
async function boot(){
 wireCanvas();$('#toast').hidden=true;$('#ghost').hidden=true;$('#rt').hidden=true;$('#preview').hidden=true;
 $('#pvclose').onclick=()=>$('#preview').hidden=true;[...$('#pvseg').children].forEach((b,i)=>{b.innerHTML=ico(['desk','tab','ph'][i]);b.onclick=()=>setPvDevice(b.dataset.d)});
 let all=[];try{all=await Promise.race([idbAll(),new Promise(r=>setTimeout(()=>r([]),1500))])}catch{}
 myBlocks=(await Promise.race([kvGet('mine'),new Promise(r=>setTimeout(()=>r(null),400))]))||[];
 let last;try{last=localStorage.getItem('trestle.last')}catch{}
 const start=all.find(s=>s.id===last)||all.sort((a,b)=>b.updatedAt-a.updatedAt)[0];
 if(!start)fresh=true;site=start||fromStarter('bakery');page=site.pages[0];histReset();renderAll();setStatus(start?'Saved':'Example site');connect();
}
boot();
