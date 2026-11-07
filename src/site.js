/* ---------- Site runtime: fonts, theme, artwork and the CSS every published site ships with ---------- */
const FONTS={
 'Fraunces':'Fraunces:wght@400;600;700','DM Serif Display':'DM+Serif+Display','Playfair Display':'Playfair+Display:wght@400;600;700','Lora':'Lora:wght@400;600;700',
 'Archivo':'Archivo:wght@400;600;800','Bricolage Grotesque':'Bricolage+Grotesque:wght@400;600;800','Sora':'Sora:wght@400;600;700','Manrope':'Manrope:wght@400;600;800',
 'Oswald':'Oswald:wght@400;500;700','Figtree':'Figtree:wght@400;600;700','Karla':'Karla:wght@400;600;700','Lato':'Lato:wght@400;700','Work Sans':'Work+Sans:wght@400;600;700',
 'Nunito Sans':'Nunito+Sans:wght@400;600;700','Source Sans 3':'Source+Sans+3:wght@400;600;700','Libre Baskerville':'Libre+Baskerville:wght@400;700'
};
const fontsHref=names=>'https://fonts.googleapis.com/css2?'+[...new Set(names)].filter(n=>FONTS[n]).map(n=>'family='+FONTS[n]).join('&')+'&display=swap';
const THEMES={
 harbour:{label:'Harbour',bg:'#F5F8F7',surface:'#E3EDE9',text:'#12302E',muted:'#4C6461',accent:'#0E7C6B',head:'Fraunces',body:'Figtree',radius:10},
 bakehouse:{label:'Bakehouse',bg:'#FFFAF2',surface:'#F6EAD8',text:'#2E1C12',muted:'#6D5646',accent:'#B4461F',head:'DM Serif Display',body:'Karla',radius:14},
 monograph:{label:'Monograph',bg:'#FFFFFF',surface:'#F1F1EF',text:'#111111',muted:'#5C5C58',accent:'#111111',head:'Archivo',body:'Archivo',radius:0},
 midnight:{label:'Midnight',bg:'#0F1522',surface:'#1A2335',text:'#EEF1F7',muted:'#A6B0C4',accent:'#7CC4FF',head:'Sora',body:'Manrope',radius:12},
 citrus:{label:'Citrus',bg:'#FFFDF0',surface:'#FFF3C4',text:'#1E1A05',muted:'#615A33',accent:'#F2B200',head:'Bricolage Grotesque',body:'Nunito Sans',radius:18},
 bloom:{label:'Bloom',bg:'#FFF7F8',surface:'#FBE5EB',text:'#3A1226',muted:'#7A4E62',accent:'#BE1E5D',head:'Playfair Display',body:'Lato',radius:6},
 workshop:{label:'Workshop',bg:'#F4F4EF',surface:'#E3E3DA',text:'#1F2420',muted:'#555C55',accent:'#D2470E',head:'Oswald',body:'Source Sans 3',radius:3},
 bushland:{label:'Bushland',bg:'#10231C',surface:'#183329',text:'#F0F5EC',muted:'#AEC0B2',accent:'#B7E36A',head:'Lora',body:'Work Sans',radius:8}
};
const hex2=h=>{h=(h||'#000').replace('#','');if(h.length===3)h=h.split('').map(x=>x+x).join('');return [0,2,4].map(i=>parseInt(h.substr(i,2),16)||0)};
const mix=(a,b,t)=>{const A=hex2(a),B=hex2(b);return '#'+A.map((v,i)=>Math.round(v+(B[i]-v)*t).toString(16).padStart(2,'0')).join('')};
const lum=h=>{const c=hex2(h).map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});return .2126*c[0]+.7152*c[1]+.0722*c[2]};
const contrast=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
const onColor=h=>contrast(h,'#FFFFFF')>=contrast(h,'#141414')?'#FFFFFF':'#141414';
function themeVars(t){return `--c-bg:${t.bg};--c-surface:${t.surface};--c-text:${t.text};--c-muted:${t.muted};--c-accent:${t.accent};--c-on:${onColor(t.accent)};--f-head:'${t.head}',Georgia,serif;--f-body:'${t.body}',system-ui,sans-serif;--r:${t.radius}px;--scale:${t.scale||1}`}

/* Artwork recolours itself from the site's theme, so sample sites look finished before any photos are added. */
const ART_COUNT=12;
function artSVG(n,t){
 n=+n||0;const k=n%8,flip=n>=8;const a=t.accent,b=flip?t.text:t.surface,c=flip?t.surface:t.text,d=t.bg;const m1=mix(a,d,.45),m2=mix(a,c,.4),m3=mix(b,a,.3);let s='';
 const W=1200,H=800;
 if(k===0){s=`<rect width="${W}" height="${H}" fill="${b}"/>`;[520,420,320,220,120].forEach((r,i)=>{s+=`<path d="M${600-r} ${H}V${H-r*.7}a${r} ${r} 0 0 1 ${r*2} 0V${H}Z" fill="${[a,m1,d,m2,b][i]}"/>`})}
 if(k===1){s=`<rect width="${W}" height="${H}" fill="${m3}"/><circle cx="840" cy="300" r="170" fill="${d}"/><path d="M0 520C200 400 380 460 560 520S920 620 1200 440V800H0Z" fill="${m1}"/><path d="M0 640C260 520 460 700 720 640S1040 560 1200 620V800H0Z" fill="${a}"/><path d="M0 730C300 680 620 790 1200 710V800H0Z" fill="${m2}"/>`}
 if(k===2){s=`<rect width="${W}" height="${H}" fill="${d}"/>`;[[a,160],[m1,300],[m3,440],[m2,580]].forEach(([f,y])=>{let p=`M0 ${y}`;for(let x=0;x<=1200;x+=300)p+=`q150 ${(x/300%2?-1:1)*110} 300 0`;s+=`<path d="${p}V800H0Z" fill="${f}"/>`})}
 if(k===3){s=`<rect width="${W}" height="${H}" fill="${d}"/><rect x="40" y="40" width="520" height="460" fill="${a}"/><rect x="580" y="40" width="580" height="220" fill="${b}"/><rect x="580" y="280" width="270" height="480" fill="${m2}"/><rect x="870" y="280" width="290" height="220" fill="${m1}"/><rect x="40" y="520" width="520" height="240" fill="${m3}"/><rect x="870" y="520" width="290" height="240" fill="${a}"/>`}
 if(k===4){s=`<rect width="${W}" height="${H}" fill="${a}"/>`;[640,520,400,280,160].forEach((r,i)=>{s+=`<circle cx="860" cy="620" r="${r}" fill="${[m2,m1,d,b,a][i]}"/>`})}
 if(k===5){s=`<rect width="${W}" height="${H}" fill="${b}"/>`;for(let i=-4;i<12;i++)s+=`<path d="M${i*150} 800L${i*150+420} 0h75L${i*150+75} 800Z" fill="${[a,m1,m3][(i+4)%3]}"/>`}
 if(k===6){s=`<rect width="${W}" height="${H}" fill="${m2}"/>`;for(let x=0;x<13;x++)for(let y=0;y<9;y++){const r=6+((x*3+y*5+n)%7)*5;s+=`<circle cx="${x*100}" cy="${y*100}" r="${r}" fill="${(x+y)%4?m1:d}"/>`}}
 if(k===7){s=`<rect width="${W}" height="${H}" fill="${m3}"/><rect x="330" y="90" width="540" height="620" rx="270" fill="${d}"/><rect x="380" y="140" width="440" height="520" rx="220" fill="${a}"/><circle cx="600" cy="400" r="120" fill="${b}"/><path d="M0 680H1200V800H0Z" fill="${m2}"/>`}
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">${s}</svg>`;
}
const artURI=(n,t)=>'data:image/svg+xml,'+encodeURIComponent(artSVG(n,t));

const SITE_CSS=`
.tr-site{container:site/inline-size;background:var(--c-bg);color:var(--c-text);font-family:var(--f-body);font-size:calc(17px*var(--scale,1));line-height:1.6;-webkit-font-smoothing:antialiased;min-height:100%}
.tr-site *{box-sizing:border-box}
.tr-site img{max-width:100%;display:block}
.tr-site h1,.tr-site h2,.tr-site h3,.tr-site p,.tr-site ul,.tr-site figure,.tr-site blockquote{margin:0;padding:0}
.tr-site ul{list-style:none}
.tr-site h1,.tr-site h2,.tr-site h3{font-family:var(--f-head);font-weight:700;line-height:1.12;text-wrap:balance;color:inherit}
.tr-site h1{font-size:clamp(2.3rem,6.2cqw,4.6rem);letter-spacing:-.015em}
.tr-site h2{font-size:clamp(1.8rem,3.8cqw,2.9rem);letter-spacing:-.01em}
.tr-site h3{font-size:1.25rem;line-height:1.25}
.tr-site a{color:inherit}
.sec{--s-bg:var(--c-bg);--s-fg:var(--c-text);--s-mut:var(--c-muted);--s-card:var(--c-surface);--s-btn:var(--c-accent);--s-btnfg:var(--c-on);--s-line:color-mix(in srgb,var(--s-fg) 16%,transparent);--s-link:var(--c-accent);background:var(--s-bg);color:var(--s-fg);position:relative}
.tone-tint{--s-bg:var(--c-surface);--s-card:var(--c-bg)}
.tone-accent{--s-bg:var(--c-accent);--s-fg:var(--c-on);--s-mut:color-mix(in srgb,var(--c-on) 82%,var(--c-accent));--s-card:color-mix(in srgb,var(--c-on) 12%,var(--c-accent));--s-btn:var(--c-on);--s-btnfg:var(--c-accent);--s-link:var(--c-on)}
.tone-ink{--s-bg:var(--c-text);--s-fg:var(--c-bg);--s-mut:color-mix(in srgb,var(--c-bg) 75%,var(--c-text));--s-card:color-mix(in srgb,var(--c-bg) 10%,var(--c-text));--s-btn:var(--c-bg);--s-btnfg:var(--c-text);--s-link:var(--c-bg)}
.sec.has-bg{background-image:linear-gradient(rgb(0 0 0/var(--ov,.6)),rgb(0 0 0/var(--ov,.6))),var(--bgimg);background-size:cover;background-position:center;--s-fg:#fff;--s-mut:#ffffffe6;--s-line:#ffffff40;--s-link:#fff}
.pic.full{border-radius:0}
.wrap{max-width:var(--w,1120px);margin-inline:auto;padding-inline:clamp(20px,5cqw,48px)}
.w-n{--w:760px}.w-w{--w:1400px}.w-f{--w:none}
.pad-0{padding-block:0}.pad-s{padding-block:clamp(26px,4cqw,44px)}.pad-m{padding-block:clamp(46px,7cqw,88px)}.pad-l{padding-block:clamp(68px,10cqw,132px)}
.head{max-width:44rem;display:grid;gap:.7rem;margin-bottom:clamp(26px,4cqw,48px)}
.head:last-child{margin-bottom:0}
.al-c{text-align:center}.al-c .head{margin-inline:auto}.al-c .acts{justify-content:center}
.eyebrow{font-size:.78rem;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--s-link)}
.lead{font-size:1.14rem;color:var(--s-mut);max-width:40rem}.al-c .lead{margin-inline:auto}
.prose{color:var(--s-fg);max-width:42rem;display:block;white-space:pre-line}.al-c .prose{margin-inline:auto}
.prose a,.lead a{color:var(--s-link)}
.mut{color:var(--s-mut)}
.acts{display:flex;flex-wrap:wrap;gap:12px;margin-top:1.5rem}
.btn{display:inline-flex;align-items:center;justify-content:center;font-family:var(--f-body);font-weight:700;font-size:1rem;line-height:1.2;padding:.85em 1.4em;border-radius:var(--r);background:var(--s-btn);color:var(--s-btnfg);text-decoration:none;border:2px solid var(--s-btn);cursor:pointer;transition:transform .15s,filter .15s}
.tr-site a.btn{color:var(--s-btnfg)}
.btn:hover{filter:brightness(1.08);transform:translateY(-1px)}
.tr-site a.btn.alt,.btn.alt{background:transparent;color:var(--s-fg);border-color:var(--s-line)}
.card{background:var(--s-card);border-radius:var(--r);padding:1.5rem;display:grid;gap:.5rem;align-content:start}
.grid{display:grid;gap:clamp(14px,2.2cqw,26px);grid-template-columns:repeat(var(--cols,3),minmax(0,1fr))}
.pic{width:100%;height:100%;object-fit:cover;border-radius:var(--r);aspect-ratio:var(--ar,4/3)}
.split{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(26px,5cqw,68px);align-items:center}
.split>*{min-width:0}
.flip .split>:first-child{order:2}
.nav{z-index:20;border-bottom:1px solid var(--s-line)}
.nav.sticky{position:sticky;top:0}
.nav-in{display:flex;align-items:center;justify-content:space-between;gap:20px;padding-block:14px}
.logo{font-family:var(--f-head);font-weight:700;font-size:1.3rem;text-decoration:none;display:flex;align-items:center;gap:10px;line-height:1.1;white-space:nowrap}
.logo img{height:36px;width:auto}
.nav-links{display:flex;align-items:center;gap:clamp(14px,2.4cqw,28px);flex-wrap:wrap;justify-content:flex-end}
.nav-links a:not(.btn){text-decoration:none;font-weight:600;font-size:.96rem}
.nav-links a:not(.btn):hover{color:var(--s-link)}
.nav .btn{padding:.6em 1.05em;font-size:.94rem}
.nav-c{position:absolute;opacity:0;pointer-events:none}
.nav-b{display:none;width:42px;height:42px;cursor:pointer;align-items:center;justify-content:center;border-radius:var(--r)}
.nav-b span,.nav-b span::before,.nav-b span::after{content:"";display:block;width:22px;height:2px;background:currentColor;position:relative}
.nav-b span::before{position:absolute;top:-7px}.nav-b span::after{position:absolute;top:7px}
.v-center .hero-in{display:grid;gap:clamp(26px,4cqw,48px)}
.hero-pic{--ar:5/4}
.v-center .hero-pic{--ar:21/9}
.v-cover .wrap{position:relative}
.stat{display:grid;gap:.15rem}.stat b{font-family:var(--f-head);font-size:clamp(2rem,4.6cqw,3.3rem);line-height:1.05;color:var(--s-link)}
.feat-ic{width:40px;height:40px;border-radius:calc(var(--r)*.8);background:var(--s-btn);color:var(--s-btnfg);display:grid;place-items:center;font-weight:800;font-family:var(--f-head);margin-bottom:.4rem}
.step{display:grid;gap:.45rem;border-top:2px solid var(--s-link);padding-top:1rem}.step-n{font-family:var(--f-head);font-size:1.5rem;font-weight:700;color:var(--s-link)}
.gal{columns:var(--cols,3);column-gap:14px}.gal figure{break-inside:avoid;margin-bottom:14px}.gal .pic{height:auto}
.gal.even{columns:auto;display:grid;grid-template-columns:repeat(var(--cols,3),minmax(0,1fr));gap:14px}.gal.even figure{margin:0}.gal.even .pic{--ar:1/1}
.gal figcaption{font-size:.88rem;color:var(--s-mut);padding-top:.4rem}
.person .pic{--ar:1/1;margin-bottom:.5rem}
.quote{font-family:var(--f-head);font-size:1.16rem;line-height:1.4}
.who{font-size:.92rem;color:var(--s-mut)}
.logos{display:flex;flex-wrap:wrap;gap:16px clamp(26px,5cqw,56px);align-items:center;justify-content:center;font-family:var(--f-head);font-weight:700;font-size:1.15rem;color:var(--s-mut)}
.faq{display:grid;max-width:48rem;text-align:left}.al-c .faq{margin-inline:auto}
.faq details{border-bottom:1px solid var(--s-line);padding-block:1rem}
.faq summary{font-weight:700;cursor:pointer;font-size:1.06rem}
.faq details p{color:var(--s-mut);padding-top:.5rem}
.plan{gap:.7rem;padding:1.7rem;text-align:left}
.plan.hot{background:var(--c-accent);color:var(--c-on);--s-mut:color-mix(in srgb,var(--c-on) 82%,var(--c-accent));--s-btn:var(--c-on);--s-btnfg:var(--c-accent);--s-link:var(--c-on)}
.price{font-family:var(--f-head);font-size:2.3rem;font-weight:700;line-height:1.1}
.plan li{padding:.28rem 0 .28rem 1.3rem;position:relative}.plan li::before{content:"";position:absolute;left:2px;top:.75em;width:8px;height:8px;border-radius:50%;background:var(--s-link)}
.rows{display:grid;gap:0;max-width:40rem;width:100%;text-align:left}.al-c .rows{margin-inline:auto}
.row{display:flex;justify-content:space-between;gap:20px;padding-block:.65rem;border-bottom:1px solid var(--s-line)}
.row span:last-child{font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap}
.menu{display:grid;grid-template-columns:repeat(var(--cols,2),minmax(0,1fr));gap:.2rem clamp(26px,5cqw,64px);text-align:left}
.dish{padding-block:.8rem;border-bottom:1px dotted var(--s-line);display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.1rem 1rem}
.dish b{font-weight:700}.dish .pr{font-weight:700;font-variant-numeric:tabular-nums}.dish .mut{grid-column:1/-1;font-size:.94rem}
.cta-in{display:flex;align-items:center;justify-content:space-between;gap:26px;flex-wrap:wrap}
.cta-in .head{margin:0}.al-c .cta-in{flex-direction:column;justify-content:center}.cta-in .acts{margin:0}
.form{display:grid;gap:14px;text-align:left}
.form label{display:grid;gap:5px;font-weight:600;font-size:.93rem}
.form input,.form textarea{font:inherit;font-weight:400;color:var(--c-text);background:var(--c-bg);border:1.5px solid color-mix(in srgb,var(--c-text) 24%,transparent);border-radius:var(--r);padding:.7em .85em;width:100%}
.form textarea{min-height:130px;resize:vertical}
.form .btn{justify-self:start}
.form-note{font-size:.86rem;color:var(--s-mut)}
.frame-16{aspect-ratio:16/9;width:100%;border:0;border-radius:var(--r);display:block}.frame-map{aspect-ratio:21/9;min-height:280px;width:100%;border:0;border-radius:var(--r);display:block}
.stub{display:grid;place-items:center;text-align:center;padding:1.5rem;background:var(--s-card);color:var(--s-mut);font-size:.95rem}
.ft{font-size:.95rem}.ft-in{display:flex;justify-content:space-between;gap:26px;flex-wrap:wrap;align-items:flex-start}
.ft-links{display:flex;gap:18px;flex-wrap:wrap}.ft-links a{text-decoration:none}.ft-links a:hover{text-decoration:underline}
.ft-end{margin-top:1.4rem;padding-top:1rem;border-top:1px solid var(--s-line);font-size:.86rem;color:var(--s-mut)}
.cols{display:grid;gap:clamp(20px,4cqw,48px);align-items:start}
.cols>div{display:grid;gap:1rem;min-width:0}
.cols.mid{align-items:center}
.sp{height:var(--h,24px)}
.hr{border:0;border-top:1px solid var(--s-line);margin:0}
@container site (max-width:820px){.grid,.gal.even{grid-template-columns:repeat(2,minmax(0,1fr))}.stats.grid{grid-template-columns:repeat(var(--cols,3),minmax(0,1fr))}.gal{columns:2}.split{grid-template-columns:minmax(0,1fr)}.flip .split>:first-child{order:0}.cols{grid-template-columns:minmax(0,1fr)!important}.menu{grid-template-columns:minmax(0,1fr)}
 .nav-b{display:flex}.nav-links{display:none;position:absolute;left:0;right:0;top:100%;background:var(--s-bg);flex-direction:column;align-items:stretch;gap:0;padding:8px 20px 18px;border-bottom:1px solid var(--s-line);box-shadow:0 12px 20px rgb(0 0 0/.08)}.nav-links a:not(.btn){padding:.7rem 0;font-size:1.05rem}.nav-c:checked~.nav-links{display:flex}.nav .wrap{position:static}}
@container site (max-width:520px){.grid{grid-template-columns:minmax(0,1fr)}.stats.grid{grid-template-columns:repeat(var(--cols,3),minmax(0,1fr))}.stats.grid[style*="--cols:4"]{grid-template-columns:repeat(2,minmax(0,1fr))}.stat b{font-size:1.75rem}.stat span{font-size:.9rem;line-height:1.3}.gal.even{grid-template-columns:repeat(2,minmax(0,1fr))}.gal{columns:2}.hide-m{display:none}.v-center .hero-pic{--ar:4/3}.frame-map{aspect-ratio:4/3}}
@container site (min-width:521px){.hide-d{display:none}}
`;
const EDIT_CSS=`
[data-block]{outline:0 solid transparent;transition:outline-color .1s}
[data-block]:hover{outline:1px dashed #8a93a0;outline-offset:-1px}
[data-block].ed-sel{outline:2px solid #FFC83D;outline-offset:-2px;box-shadow:inset 0 0 0 3px rgb(22 27 34/.55)}
[data-edit]{cursor:text;outline:none;border-radius:2px;min-width:1ch}
[data-edit]:hover{box-shadow:0 0 0 1px rgb(255 200 61/.9)}
[data-edit]:focus{box-shadow:0 0 0 2px #FFC83D}
[data-edit]:empty::before{content:attr(data-ph);opacity:.45}
[data-img]{cursor:pointer}
.ed-sel [data-img]:hover{outline:3px solid #FFC83D;outline-offset:-3px}
.form input,.form textarea,.form button{pointer-events:none}
.hide-m,.hide-d{display:block!important;opacity:.42;background-image:repeating-linear-gradient(45deg,transparent 0 10px,rgb(120 130 140/.14) 10px 20px)}
.ed-bar{zoom:var(--iz,1);position:absolute;right:10px;top:10px;display:flex;align-items:center;gap:1px;background:#161B22;color:#fff;border-radius:7px;padding:3px;z-index:30;font:600 12px/1 'Schibsted Grotesk',system-ui,sans-serif;box-shadow:0 6px 18px rgb(0 0 0/.3)}
.ed-bar b{padding:0 8px;font-weight:600;color:#FFC83D;white-space:nowrap}
.ed-bar button{all:unset;width:30px;height:30px;display:grid;place-items:center;border-radius:5px;cursor:pointer;touch-action:none}
.ed-bar button:hover{background:#ffffff26}.ed-bar button:focus-visible{outline:2px solid #FFC83D}
.ed-bar button[disabled]{opacity:.3;pointer-events:none}
.ed-bar svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.ed-grip{cursor:grab!important}
.ed-plus{all:unset;zoom:var(--iz,1);position:absolute;left:50%;bottom:-14px;transform:translateX(-50%);width:28px;height:28px;border-radius:50%;background:#FFC83D;color:#1C1500;display:grid;place-items:center;font:700 19px/1 system-ui;z-index:29;cursor:pointer;opacity:0;box-shadow:0 3px 10px rgb(0 0 0/.3)}
[data-block]:hover>.ed-plus,.ed-plus:focus-visible{opacity:1}
[data-block].ed-sel>.ed-plus{opacity:1}
.ed-drop{height:0;position:relative;z-index:40}.ed-drop::after{content:"";position:absolute;left:0;right:0;top:-3px;height:6px;background:#FFC83D;box-shadow:0 0 0 1px #161B22}
.ed-empty{padding:70px 24px;text-align:center;color:var(--c-muted);font-size:1rem}
.ed-drag{opacity:.35}
[data-edit]:empty{display:none}.ed-sel [data-edit]:empty{display:block}.head:not(:has(>:not(:empty))){display:none}.ed-sel .head{display:grid}
@media (hover:none){.ed-plus{opacity:1}}
`;
