(function(){
  "use strict";
  const root=document.getElementById("journal"),levels=["未开始","已梳理","已刷题","已复盘"],sources=[
    {subject:"数学",key:"review-tracker-logs-v1"},{subject:"生物",key:"review-tracker-biology-logs-v1"},{subject:"化学",key:"review-tracker-chemistry-logs-v1"},{subject:"语文",key:"review-tracker-chinese-logs-v1"},{subject:"物理",key:"review-tracker-physics-logs-v1"}
  ];
  function read(key){try{const value=JSON.parse(localStorage.getItem(key)||"[]");return Array.isArray(value)?value:[];}catch(e){return [];}}
  function esc(v){return String(v||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");}
  function day(iso){const d=new Date(iso);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
  function clock(iso){const d=new Date(iso);return String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0");}
  let logs=[];sources.forEach(function(source){read(source.key).forEach(function(log){logs.push(Object.assign({subject:source.subject},log));});});logs.sort(function(a,b){return b.createdAt.localeCompare(a.createdAt);});
  const groups={};logs.forEach(function(log){const key=day(log.createdAt);(groups[key]||(groups[key]=[])).push(log);});
  const content=Object.keys(groups).sort().reverse().map(function(key){return `<section class="log-day"><header><h2>${key}</h2><span>${groups[key].length} 条</span></header><div class="log-timeline">${groups[key].map(function(log){const name=log.moduleName||log.name,path=log.chapterName||log.path;return `<article class="log-item"><time>${clock(log.createdAt)}</time><span class="log-marker status-bg-${log.toLevel}"></span><div class="log-main"><span class="log-path">${esc(log.subject)} · ${esc(path)}</span><strong>${esc(name)}</strong><p>${levels[log.fromLevel]} → <b class="status-pill status-${log.toLevel}">${levels[log.toLevel]}</b></p>${log.note?`<blockquote>${esc(log.note)}</blockquote>`:""}</div></article>`;}).join("")}</div></section>`;}).join("");
  root.innerHTML=`<div class="app-shell"><header class="topbar"><a class="brand" href="index.html">← 总览</a><span class="top-actions"><a class="log-link" href="plans.html">计划</a><span class="subject-chip">跨科日志</span></span></header><main><section class="page logs-page"><div class="logs-head"><div><p class="eyebrow">REVIEW JOURNAL</p><h1>复习日志</h1></div><strong>${logs.length}<small> 条记录</small></strong></div>${content||'<div class="logs-empty"><strong>还没有复习日志</strong><span>在各科目录中设置状态后自动记录。</span><a href="index.html">返回总览</a></div>'}</section></main></div>`;
})();
