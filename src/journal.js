
(function(){
  var $=function(s,r){return (r||document).querySelector(s)}, $$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
  var toastT;
  function toast(msg){var t=$("#toast");$("#toast-t").textContent=msg;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(function(){t.hidden=true},3200);}

  /* duck */
  var says=["出发啦，呱！","海风好舒服～","下一站去日光！","肚子饿了，呱…","帮我贴张便签吧","今天也辛苦啦"], si=0;
  $("#duck-hero").addEventListener("click",function(){si=(si+1)%says.length;$("#duck-say").textContent=says[si];this.style.animation="none";void this.offsetWidth;this.style.animation="";});
  $("#duck-hero").style.cursor="pointer";
  var dt=$("#duck-top");
  dt.addEventListener("click",function(){window.scrollTo({top:0,behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"})});
  window.addEventListener("scroll",function(){dt.dataset.hide=window.scrollY>600?"false":"true"},{passive:true});

  /* video */
  var v=$("#vid");
  $("#vid-play").addEventListener("click",function(){if(v.paused){v.play();this.textContent="暂停"}else{v.pause();this.textContent="播放"}});
  $("#vid-sound").addEventListener("click",function(){v.muted=!v.muted;this.textContent=v.muted?"开声音":"静音";if(!v.muted&&v.paused){v.play();$("#vid-play").textContent="暂停"}});

  /* nav highlight */
  var links=$$(".nav a");
  if("IntersectionObserver" in window){
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){links.forEach(function(a){a.classList.toggle("on",a.dataset.sec===e.target.id)})}})},{rootMargin:"-40% 0px -55% 0px"});
    ["records","route","food"].forEach(function(id){io.observe(document.getElementById(id))});
  }

  /* lightbox */
  var shots=$$("[data-full]"), lb=$("#lb"), cur=0, lastBtn=null;
  function show(i){cur=(i+shots.length)%shots.length;var b=shots[cur];$("#lb-img").src=b.dataset.full;$("#lb-img").alt=b.querySelector("img").alt;
    var ja=b.closest("figure").querySelector(".cap .ja");$("#lb-cap").textContent=ja?ja.textContent:"";$("#lb-n").textContent=(cur+1)+" / "+shots.length;}
  shots.forEach(function(b,i){b.addEventListener("click",function(){lastBtn=b;show(i);lb.hidden=false;$("#lb-close").focus();})});
  function close(){lb.hidden=true;if(lastBtn)lastBtn.focus();}
  $("#lb-close").addEventListener("click",close);
  $("#lb-prev").addEventListener("click",function(){show(cur-1)});
  $("#lb-next").addEventListener("click",function(){show(cur+1)});
  lb.addEventListener("click",function(e){if(e.target===lb||e.target.classList.contains("lb-stage"))close();});
  document.addEventListener("keydown",function(e){if(lb.hidden)return;if(e.key==="Escape")close();if(e.key==="ArrowLeft")show(cur-1);if(e.key==="ArrowRight")show(cur+1);});
  var sx=null;lb.addEventListener("touchstart",function(e){sx=e.touches[0].clientX},{passive:true});
  lb.addEventListener("touchend",function(e){if(sx===null)return;var dx=e.changedTouches[0].clientX-sx;if(Math.abs(dx)>50)show(cur+(dx<0?1:-1));sx=null;});

  /* food stamps (per viewer) */
  var foods=[["寿司","Tokyo","寿司与拉面","sushi"],["しらす","Enoshima","吻仔鱼盖饭","shirasu"],["湯葉","Nikko","日光汤叶","yuba"],["黒玉子","Hakone","大涌谷黑蛋","kurotamago"],["五平餅","Kiso","五平饼","gohei"],["蕎麦","Matsumoto","信州荞麦面","soba"],["飛騨牛","Takayama","飞驒牛","hida"],["抹茶","Kyoto","抹茶与汤豆腐","matcha"],["柿の葉","Nara","柿叶寿司","kakinoha"],["めはり","Kumano","目张寿司","mehari"],["たこ焼","Osaka","章鱼烧","takoyaki"]];
  var KEY="tabi-nikki-stamps", got={};
  try{got=JSON.parse(localStorage.getItem(KEY)||"{}")||{}}catch(e){got={}}
  function tally(){var n=0;for(var k in got)if(got[k])n++;$("#tally").innerHTML=" 已集 <b>"+n+"</b> / "+foods.length;
    $("#food-say").textContent=n===0?"今天吃了吗？":n===foods.length?"全部集齐，呱！":"还差 "+(foods.length-n)+" 个，加油！";}
  foods.forEach(function(f){
    var b=document.createElement("button");b.type="button";b.className="stamp";b.id="stamp-"+f[3];b.setAttribute("aria-pressed",got[f[3]]?"true":"false");
    var s=document.createElement("span");s.className="seal";s.lang="ja";s.textContent=f[0];var sm=document.createElement("small");sm.textContent=f[1].toUpperCase();s.appendChild(sm);
    var d=document.createElement("span");d.className="dish";d.textContent=f[2];
    b.appendChild(s);b.appendChild(d);
    b.addEventListener("click",function(){got[f[3]]=!got[f[3]];b.setAttribute("aria-pressed",got[f[3]]?"true":"false");try{localStorage.setItem(KEY,JSON.stringify(got))}catch(e){}tally();});
    $("#stamps").appendChild(b);
  });
  tally();

  /* sticky notes (shared, db) */
  var COLORS=[["yellow","var(--n-yellow)","黄"],["pink","var(--n-pink)","粉"],["mint","var(--n-mint)","绿"],["blue","var(--n-blue)","蓝"]];
  var MAX=120, db=null, user=null, me=null, mine=[], all={}, writing=Promise.resolve(), readOnly=false, renderTok=0;
  var pieces=$$("figure[data-piece]");

  function rot(id){var h=0;for(var i=0;i<id.length;i++)h=(h*31+id.charCodeAt(i))|0;return ((Math.abs(h)%7)-3)*0.8;}
  function colorVar(c){for(var i=0;i<COLORS.length;i++)if(COLORS[i][0]===c)return COLORS[i][1];return COLORS[0][1];}
  function ago(t){var s=(Date.now()-t)/1000;if(s<60)return "刚刚";if(s<3600)return Math.floor(s/60)+" 分钟前";if(s<86400)return Math.floor(s/3600)+" 小时前";var d=new Date(t);return (d.getMonth()+1)+"月"+d.getDate()+"日";}

  pieces.forEach(function(fig){
    var id=fig.dataset.piece, board=document.createElement("div");board.className="board";
    board.innerHTML='<div class="board-head"><span class="lbl">便签</span><button type="button" class="add" id="add-'+id+'">＋ 贴一张</button></div><div class="notes" id="notes-'+id+'"></div>';
    fig.appendChild(board);
    $("#add-"+id,board).addEventListener("click",function(){openComposer(fig,id)});
  });

  function openComposer(fig,id){
    if(!db){toast("登录 Claude 后才能贴便签");return;}
    if(readOnly){toast("你现在只能查看。请主人在分享里把你设为 Contributor");return;}
    var board=$(".board",fig);if($(".composer",board)){$(".composer textarea",board).focus();return;}
    var color="yellow", c=document.createElement("div");c.className="composer";
    c.innerHTML='<textarea id="ta-'+id+'" maxlength="'+MAX+'" placeholder="写点什么吧…" aria-label="便签内容"></textarea><div class="c-row" role="radiogroup" aria-label="便签颜色"></div>';
    var row=$(".c-row",c), ta=$("textarea",c);
    ta.style.setProperty("--nc",colorVar(color));
    COLORS.forEach(function(k){var s=document.createElement("button");s.type="button";s.className="sw";s.style.background=k[1];s.setAttribute("role","radio");s.setAttribute("aria-label",k[2]+"色");s.setAttribute("aria-checked",k[0]===color?"true":"false");
      s.addEventListener("click",function(){color=k[0];$$(".sw",row).forEach(function(x){x.setAttribute("aria-checked","false")});s.setAttribute("aria-checked","true");ta.style.setProperty("--nc",k[1]);ta.focus();});row.appendChild(s);});
    var left=document.createElement("span");left.className="left";left.textContent="0/"+MAX;row.appendChild(left);
    var cancel=document.createElement("button");cancel.type="button";cancel.className="btn ghost";cancel.textContent="取消";row.appendChild(cancel);
    var post=document.createElement("button");post.type="button";post.className="btn primary";post.textContent="贴上";post.disabled=true;row.appendChild(post);
    ta.addEventListener("input",function(){left.textContent=ta.value.length+"/"+MAX;post.disabled=!ta.value.trim();});
    ta.addEventListener("keydown",function(e){if(e.key==="Enter"&&(e.metaKey||e.ctrlKey)&&!post.disabled){e.preventDefault();post.click();}if(e.key==="Escape")cancel.click();});
    cancel.addEventListener("click",function(){c.remove();$("#add-"+id).focus();});
    post.addEventListener("click",function(){
      var text=ta.value.trim().slice(0,MAX);if(!text)return;post.disabled=true;post.textContent="贴上中…";
      var item={id:Math.random().toString(36).slice(2,10)+Date.now().toString(36),piece:id,text:text,color:color,at:Date.now()};
      saveMine(mine.concat([item])).then(function(){c.remove();toast("贴好了");},function(){post.disabled=false;post.textContent="贴上";});
    });
    board.insertBefore(c,$(".notes",board));ta.focus();
  }

  function saveMine(next){
    var p=writing.then(function(){return db.doc("notes/"+me).set({items:next.slice(-200)});});
    writing=p.catch(function(){});
    return p.then(function(){mine=next;},function(e){
      if(e&&e.code==="invalid_argument"){readOnly=true;toast("你现在只能查看。请主人在分享里把你设为 Contributor");}
      else toast("没贴上，网络好像有点问题，稍后再试");
      throw e;
    });
  }
  function removeNote(owner,nid){
    if(owner===me){saveMine(mine.filter(function(n){return n.id!==nid})).then(function(){toast("已撕下")},function(){});return;}
    var items=(all[owner]||[]).filter(function(n){return n.id!==nid});
    var p=writing.then(function(){return db.doc("notes/"+owner).set({items:items})});writing=p.catch(function(){});
    p.then(function(){toast("已撕下")},function(){toast("没撕下来，稍后再试")});
  }

  function render(){
    var tok=++renderTok, by={}, ids=[], total=0;
    Object.keys(all).forEach(function(uid){(all[uid]||[]).forEach(function(n){if(!n||typeof n.text!=="string"||!n.piece)return;(by[n.piece]=by[n.piece]||[]).push({o:uid,n:n});total++;});if(ids.indexOf(uid)<0)ids.push(uid);});
    $("#fact-notes").textContent=total;
    $("#bar-count").innerHTML=total?"<b>"+total+"</b> 张便签":"";
    var go=function(ps){
      if(tok!==renderTok)return;
      pieces.forEach(function(fig){
        var id=fig.dataset.piece, box=$("#notes-"+id), list=(by[id]||[]).sort(function(a,b){return (a.n.at||0)-(b.n.at||0)});
        $(".lbl",fig).textContent=list.length?"便签 · "+list.length:"便签";
        var em=$(".empty",fig);
        if(!list.length&&!em){em=document.createElement("div");em.className="empty";em.innerHTML='<img src="media/duck-head.png" alt=""><span>还没有便签，来贴第一张吧</span>';box.parentNode.insertBefore(em,box);}
        if(list.length&&em)em.remove();
        var keep={};list.forEach(function(x){keep[x.n.id]=1});
        $$(".note",box).forEach(function(el){if(!keep[el.dataset.id])el.remove();});
        list.forEach(function(x,i){
          var el=box.querySelector('[data-id="'+CSS.escape(x.n.id)+'"]');
          if(!el){el=document.createElement("div");el.className="note";el.dataset.id=x.n.id;
            el.style.setProperty("--nc",colorVar(x.n.color));el.style.setProperty("--r",rot(x.n.id)+"deg");
            var t=document.createElement("div");t.className="txt";t.textContent=String(x.n.text).slice(0,MAX);el.appendChild(t);
            var w=document.createElement("div");w.className="who";w.innerHTML='<img alt=""><span></span>';el.appendChild(w);
            if(x.o===me||(me&&isOwner)){var d=document.createElement("button");d.type="button";d.className="del";d.textContent="×";d.setAttribute("aria-label","撕掉这张便签");
              d.addEventListener("click",function(){removeNote(x.o,x.n.id)});el.appendChild(d);}
          }
          var p=ps&&ps[x.o], img=$(".who img",el);
          if(p&&p.avatarUrl){img.src=p.avatarUrl;img.hidden=false}else img.hidden=true;
          $(".who span",el).textContent=((p&&p.isMe)?"我":((p&&p.name)||"一位朋友"))+" · "+ago(x.n.at||Date.now());
          if(box.children[i]!==el)box.insertBefore(el,box.children[i]||null);
        });
      });
    };
    if(user&&ids.length)user.profiles(ids).then(go,function(){go(null)});else go(null);
  }

  var isOwner=false;
  function noDb(){$$(".add").forEach(function(b){b.textContent="登录后可贴";b.title="登录 Claude 后才能贴便签";});}
  me="local-viewer";isOwner=true;
  try{mine=JSON.parse(localStorage.getItem("tabi-nikki-notes")||"[]");if(!Array.isArray(mine))mine=[];}catch(e){mine=[];}
  all[me]=mine;
  db={doc:function(){return {set:function(value){
    try{localStorage.setItem("tabi-nikki-notes",JSON.stringify(value.items));}
    catch(e){return Promise.reject(e);}
    all[me]=value.items;render();return Promise.resolve();
  }}}};
  render();
  setInterval(function(){if(Object.keys(all).length)render();},60000);
})();
