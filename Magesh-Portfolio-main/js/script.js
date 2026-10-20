/* ═══════════════════════════════════════
   3D PARTICLE / GRID CANVAS BACKGROUND
═══════════════════════════════════════ */
(function(){
  const canvas = document.getElementById('bg-canvas');
  const ctx = canvas.getContext('2d');
  let W, H, particles=[], connections=[];
  const PARTICLE_COUNT = 120;
  const C1 = 'rgba(0,255,247,';
  const C2 = 'rgba(191,0,255,';

  function resize(){ W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
  window.addEventListener('resize', resize); resize();

  class Particle {
    constructor(){this.reset()}
    reset(){
      this.x = Math.random()*W;
      this.y = Math.random()*H;
      this.z = Math.random()*2+0.3;
      this.vx = (Math.random()-0.5)*0.4*this.z;
      this.vy = (Math.random()-0.5)*0.4*this.z;
      this.r = Math.random()*1.5+0.4;
      this.life = 1;
      this.hue = Math.random()<0.6 ? 0 : 1; // 0=cyan, 1=purple
    }
    update(){
      this.x += this.vx; this.y += this.vy;
      if(this.x<-10)this.x=W+10; if(this.x>W+10)this.x=-10;
      if(this.y<-10)this.y=H+10; if(this.y>H+10)this.y=-10;
    }
    draw(){
      const a = this.z*0.5;
      const col = this.hue===0 ? C1 : C2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r*this.z, 0, Math.PI*2);
      ctx.fillStyle = col+(a)+')';
      ctx.shadowColor = this.hue===0 ? '#00fff7' : '#bf00ff';
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  for(let i=0;i<PARTICLE_COUNT;i++) particles.push(new Particle());

  // Floating 3D cubes (wireframe)
  const cubes = Array.from({length:5},()=>({
    x:Math.random()*W, y:Math.random()*H,
    rx:Math.random()*Math.PI*2, ry:Math.random()*Math.PI*2,
    drx:(Math.random()-0.5)*0.006, dry:(Math.random()-0.5)*0.006,
    size: 28+Math.random()*40,
    alpha: 0.04+Math.random()*0.06,
    vx:(Math.random()-0.5)*0.3, vy:(Math.random()-0.5)*0.3,
    hue: Math.random()<0.5 ? 0 : 1
  }));

  function drawCube(c){
    const s=c.size, crx=Math.cos(c.rx), srx=Math.sin(c.rx), cry=Math.cos(c.ry), sry=Math.sin(c.ry);
    const pts3d=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]];
    const proj = pts3d.map(([x,y,z])=>{
      const x1=x*cry+z*sry, z1=z*cry-x*sry;
      const y1=y*crx-z1*srx, z2=z1*crx+y*srx;
      const fov=4/(4+z2*0.5);
      return [c.x+x1*s*fov, c.y+y1*s*fov];
    });
    const edges=[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
    const col = c.hue===0 ? C1 : C2;
    ctx.strokeStyle = col+c.alpha+')';
    ctx.lineWidth = 0.8;
    edges.forEach(([a,b])=>{
      ctx.beginPath(); ctx.moveTo(proj[a][0],proj[a][1]); ctx.lineTo(proj[b][0],proj[b][1]); ctx.stroke();
    });
  }

  let t=0;
  function frame(){
    ctx.clearRect(0,0,W,H);

    // Subtle radial glow
    const grd = ctx.createRadialGradient(W*0.5,H*0.35,0,W*0.5,H*0.35,W*0.7);
    grd.addColorStop(0,'rgba(0,255,247,0.025)');
    grd.addColorStop(0.5,'rgba(191,0,255,0.018)');
    grd.addColorStop(1,'transparent');
    ctx.fillStyle=grd; ctx.fillRect(0,0,W,H);

    // Rotating cubes
    cubes.forEach(c=>{
      c.rx+=c.drx; c.ry+=c.dry;
      c.x+=c.vx; c.y+=c.vy;
      if(c.x<-100)c.x=W+100; if(c.x>W+100)c.x=-100;
      if(c.y<-100)c.y=H+100; if(c.y>H+100)c.y=-100;
      drawCube(c);
    });

    // Particle connections
    for(let i=0;i<particles.length;i++){
      for(let j=i+1;j<particles.length;j++){
        const dx=particles[i].x-particles[j].x, dy=particles[i].y-particles[j].y;
        const dist=Math.sqrt(dx*dx+dy*dy);
        if(dist<120){
          const a=(1-dist/120)*0.15*particles[i].z*particles[j].z;
          ctx.beginPath();
          ctx.moveTo(particles[i].x,particles[i].y);
          ctx.lineTo(particles[j].x,particles[j].y);
          ctx.strokeStyle = C1+a+')';
          ctx.lineWidth=0.5;
          ctx.stroke();
        }
      }
    }

    // Particles
    particles.forEach(p=>{ p.update(); p.draw(); });

    // Horizontal energy lines
    const lineY = (t*0.3)%H;
    const lg = ctx.createLinearGradient(0,lineY,W,lineY);
    lg.addColorStop(0,'transparent');
    lg.addColorStop(0.3,'rgba(0,255,247,0.04)');
    lg.addColorStop(0.5,'rgba(0,255,247,0.08)');
    lg.addColorStop(0.7,'rgba(0,255,247,0.04)');
    lg.addColorStop(1,'transparent');
    ctx.fillStyle=lg; ctx.fillRect(0,lineY,W,1.5);

    t++;
    requestAnimationFrame(frame);
  }
  frame();
})();

/* ═══════════════════════════════════
   CUSTOM CURSOR
═══════════════════════════════════ */
const cur=document.getElementById('cur'), ring=document.getElementById('cur-ring');
let mx=0,my=0,rx=0,ry=0;
document.addEventListener('mousemove',e=>{
  mx=e.clientX; my=e.clientY;
  cur.style.left=mx-5+'px'; cur.style.top=my-5+'px';
});
(function animRing(){
  rx+=(mx-rx-20)*0.12; ry+=(my-ry-20)*0.12;
  ring.style.left=rx+'px'; ring.style.top=ry+'px';
  requestAnimationFrame(animRing);
})();
document.querySelectorAll('a,button,.project-card,.skill-group,.stat-card,.cert-card').forEach(el=>{
  el.addEventListener('mouseenter',()=>{ cur.style.transform='scale(2.5)'; ring.style.transform='scale(1.5)'; ring.style.borderColor='rgba(191,0,255,0.8)'; });
  el.addEventListener('mouseleave',()=>{ cur.style.transform='scale(1)'; ring.style.transform='scale(1)'; ring.style.borderColor='rgba(0,255,247,0.5)'; });
});

/* ═══════════════════════════════════
   3D CARD TILT ON HOVER
═══════════════════════════════════ */
document.querySelectorAll('.stat-card,.skill-group,.project-card,.cert-card').forEach(card=>{
  card.addEventListener('mousemove',e=>{
    const r=card.getBoundingClientRect();
    const x=(e.clientX-r.left)/r.width-0.5;
    const y=(e.clientY-r.top)/r.height-0.5;
    card.style.transform=`translateY(-8px) rotateX(${-y*12}deg) rotateY(${x*12}deg)`;
  });
  card.addEventListener('mouseleave',()=>{ card.style.transform=''; });
});

/* ═══════════════════════════════════
   SCROLL REVEAL
═══════════════════════════════════ */
const observer=new IntersectionObserver(entries=>{
  entries.forEach(e=>{
    if(e.isIntersecting){ e.target.style.opacity='1'; e.target.style.transform='translateY(0)'; }
  });
},{threshold:0.1});
document.querySelectorAll('.skill-group,.project-card,.stat-card,.cert-card,.edu-item').forEach(el=>{
  el.style.opacity='0'; el.style.transform='translateY(28px)';
  el.style.transition='opacity 0.7s ease, transform 0.7s ease';
  observer.observe(el);
});

/* ═══════════════════════════════════
   FORM → MAILTO
═══════════════════════════════════ */
function sendMail(){
  const name=document.getElementById('visitorName').value.trim();
  const email=document.getElementById('visitorEmail').value.trim();
  const msg=document.getElementById('visitorMsg').value.trim();
  if(!name||!email){ alert('Please enter your name and email before sending.'); return; }
  const subject=encodeURIComponent('Portfolio Inquiry from '+name);
  const body=encodeURIComponent('Hi Magesh,\n\nMy name is '+name+'.\nYou can reach me at: '+email+'\n\n'+(msg||'(No message provided)')+'\n\nBest regards,\n'+name);
  window.location.href='mailto:mageshelango1408@gmail.com?subject='+subject+'&body='+body;
  const toast=document.getElementById('toast');
  toast.classList.add('show');
  setTimeout(()=>toast.classList.remove('show'),4000);
}


/* ═══════════════════════════════════
   MOBILE NAV MENU
═══════════════════════════════════ */
(function(){
  const toggle=document.getElementById('navToggle'), links=document.getElementById('navLinks');
  if(!toggle||!links) return;
  const setOpen=open=>{
    links.classList.toggle('open',open);
    toggle.setAttribute('aria-expanded',String(open));
    toggle.setAttribute('aria-label',open?'Close menu':'Open menu');
  };
  toggle.addEventListener('click',()=>setOpen(!links.classList.contains('open')));
  links.addEventListener('click',e=>{ if(e.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown',e=>{ if(e.key==='Escape') setOpen(false); });
  window.addEventListener('resize',()=>{ if(window.innerWidth>768) setOpen(false); });
})();
