/* ═══════════════════════════════════════════════════════════
   MAGI AI — frontend
   Talks only to /api/chat (our own backend). The OpenRouter key never
   touches the browser.
═══════════════════════════════════════════════════════════ */
(function(){
  // On a local static server (e.g. VS Code Live Server on :5500) there is no /api/chat,
  // so talk to the local backend (node dev-server.js) on :3000 instead.
  const IS_LOCAL=/^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const API_URL=(IS_LOCAL&&location.port!=='3000')?'http://localhost:3000/api/chat':'/api/chat';
  const LOCAL_HINT='The chat backend is not running. In the project folder run: node dev-server.js (with your key in the .env file), then open http://localhost:3000';
  const MAX_HISTORY=10;          // messages sent to the backend
  const STORE_KEY='magi-chat-v1';
  const GREETING="Hi, I'm **Magi AI** — Magesh's assistant. Ask me about his projects, skills, education, or how to reach him.";
  const SUGGESTIONS=['What projects has Magesh built?','What is his tech stack?','Is he open to internships?','How can I contact him?'];

  const root=document.getElementById('magi');
  if(!root) return;
  const fab=document.getElementById('magiFab'), panel=document.getElementById('magiPanel');
  const body=document.getElementById('magiBody'), chips=document.getElementById('magiChips');
  const form=document.getElementById('magiForm'), input=document.getElementById('magiInput');
  const sendBtn=document.getElementById('magiSend');
  const closeBtn=document.getElementById('magiClose'), clearBtn=document.getElementById('magiClear');

  let history=[];     // [{role:'user'|'assistant', content}]
  let busy=false;

  /* ── persistence (per tab; safe if storage is blocked) ── */
  function save(){ try{ sessionStorage.setItem(STORE_KEY,JSON.stringify(history.slice(-40))); }catch(_){} }
  function load(){ try{ const v=JSON.parse(sessionStorage.getItem(STORE_KEY)||'[]'); return Array.isArray(v)?v:[]; }catch(_){ return []; } }

  /* ── tiny, safe markdown: escape first, then allow **bold**, `code`, lists, links ── */
  function esc(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function inline(s){
    return esc(s)
      .replace(/`([^`]+)`/g,'<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')
      .replace(/\b(https?:\/\/[^\s<)]+)/g,'<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
  }
  function render(text){
    const lines=String(text).replace(/\r/g,'').split('\n');
    let html='',list=false,para=[];
    const flush=()=>{ if(para.length){ html+='<p>'+para.join('<br>')+'</p>'; para=[]; } };
    for(const raw of lines){
      const m=raw.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/);
      if(m){ flush(); if(!list){ html+='<ul>'; list=true; } html+='<li>'+inline(m[1])+'</li>'; }
      else{ if(list){ html+='</ul>'; list=false; } if(raw.trim()==='') flush(); else para.push(inline(raw)); }
    }
    if(list) html+='</ul>'; flush();
    return html||'<p></p>';
  }

  /* ── DOM helpers ── */
  function scrollDown(){ body.scrollTop=body.scrollHeight; }
  function addMsg(role,text,opts){
    const wrap=document.createElement('div');
    wrap.className='magi-msg '+(role==='user'?'user':'bot')+((opts&&opts.error)?' error':'');
    const bub=document.createElement('div'); bub.className='magi-bubble';
    if(role==='user') bub.textContent=text; else bub.innerHTML=render(text);
    wrap.appendChild(bub); body.appendChild(wrap); scrollDown();
    return {wrap,bub};
  }
  function showTyping(){
    const wrap=document.createElement('div'); wrap.className='magi-msg bot magi-typing'; wrap.id='magiTyping';
    wrap.setAttribute('aria-label','Magi AI is typing');
    wrap.innerHTML='<div class="magi-bubble"><i></i><i></i><i></i></div>';
    body.appendChild(wrap); scrollDown();
  }
  function hideTyping(){ const t=document.getElementById('magiTyping'); if(t) t.remove(); }
  function setBusy(v){ busy=v; sendBtn.disabled=v; input.disabled=v; if(!v&&isOpen()) input.focus({preventScroll:true}); }

  function buildChips(){
    chips.innerHTML='';
    SUGGESTIONS.forEach(q=>{
      const b=document.createElement('button'); b.type='button'; b.className='magi-chip'; b.textContent=q;
      b.addEventListener('click',()=>send(q)); chips.appendChild(b);
    });
  }

  /* ── open / close ── */
  function isOpen(){ return root.dataset.open==='true'; }
  function setOpen(open){
    root.dataset.open=String(open);
    fab.setAttribute('aria-expanded',String(open));
    fab.setAttribute('aria-label',open?'Close Magi AI chat':'Open Magi AI chat');
    panel.setAttribute('aria-hidden',String(!open));
    if(open){ setTimeout(()=>{ input.focus({preventScroll:true}); scrollDown(); },320); }
  }
  fab.addEventListener('click',()=>setOpen(!isOpen()));
  closeBtn.addEventListener('click',()=>{ setOpen(false); fab.focus(); });
  document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&isOpen()){ setOpen(false); fab.focus(); } });

  clearBtn.addEventListener('click',()=>{
    if(busy) return;
    history=[]; save(); body.innerHTML=''; addMsg('bot',GREETING); buildChips();
  });

  /* ── input behaviour ── */
  function autosize(){ input.style.height='auto'; input.style.height=Math.min(input.scrollHeight,110)+'px'; }
  input.addEventListener('input',autosize);
  input.addEventListener('keydown',e=>{
    if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){ e.preventDefault(); form.requestSubmit(); }
  });
  form.addEventListener('submit',e=>{ e.preventDefault(); const t=input.value.trim(); if(t) send(t); });

  /* ── sending ── */
  function friendly(status,serverMsg){
    if(serverMsg) return serverMsg;
    if(IS_LOCAL&&(status===404||status===405)) return LOCAL_HINT;
    if(status===429) return 'Too many messages right now — please wait a moment and try again.';
    if(status>=500)  return 'Magi AI is having trouble connecting. Please try again shortly.';
    return 'Something went wrong. Please try again.';
  }

  async function send(text,isRetry){
    if(busy) return;
    if(!isRetry){
      addMsg('user',text); history.push({role:'user',content:text});
      input.value=''; autosize(); chips.innerHTML=''; save();
    }
    setBusy(true); showTyping();

    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),30000);
    try{
      const res=await fetch(API_URL,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({messages:history.slice(-MAX_HISTORY)}),
        signal:controller.signal
      });
      let data=null; try{ data=await res.json(); }catch(_){}
      if(!res.ok||!data||!data.reply) throw {status:res.status,message:data&&data.error};
      hideTyping();
      history.push({role:'assistant',content:data.reply}); save();
      addMsg('bot',data.reply);
    }catch(err){
      hideTyping();
      let msg;
      if(err&&err.name==='AbortError') msg='That took too long. Please try again.';
      else if(err&&typeof err.status==='number') msg=friendly(err.status,err.message);
      else msg=IS_LOCAL?LOCAL_HINT:"Can't reach the chat server. Check your connection and try again.";
      const {bub}=addMsg('bot',msg,{error:true});
      const retry=document.createElement('button'); retry.type='button'; retry.className='magi-retry'; retry.textContent='Try again';
      retry.addEventListener('click',()=>{ bub.parentElement.remove(); send(null,true); });
      bub.appendChild(document.createElement('br')); bub.appendChild(retry); scrollDown();
    }finally{
      clearTimeout(timer); setBusy(false);
    }
  }

  /* ── init ── */
  history=load();
  if(history.length){ history.forEach(m=>addMsg(m.role==='user'?'user':'bot',m.content)); }
  else{ addMsg('bot',GREETING); buildChips(); }
})();
