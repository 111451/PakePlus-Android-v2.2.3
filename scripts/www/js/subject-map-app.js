(function () {
  "use strict";
  const app = document.getElementById("app");
  const config = window.SUBJECT_CONFIG;
  const levels = ["未开始", "已梳理", "已刷题", "已复盘"];
  let records = read(config.recordsKey, {});
  let logs = read(config.logsKey, []);
  let activeId = null;

  function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch (e) { return fallback; } }
  function save(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {} }
  function esc(value) { return String(value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;"); }
  function level(id) { return records[id] && Number.isInteger(records[id].level) ? records[id].level : 0; }
  function finalNodes(item) { return item.trackSelf || !item.children || !item.children.length ? [item] : item.children; }
  function terminalNodes() {
    return config.groups.reduce(function (all, group) {
      group.items.forEach(function (item) { all = all.concat(finalNodes(item)); });
      return all;
    }, []);
  }
  function stats(nodes) {
    let score = 0; const exact = [0,0,0,0];
    nodes.forEach(function (node) { const value = level(node.id); score += value; exact[value] += 1; });
    return { total:nodes.length, exact:exact, sorted:exact[1]+exact[2]+exact[3], practiced:exact[2]+exact[3], reviewed:exact[3], percent:nodes.length?Math.round(score/(nodes.length*3)*100):0 };
  }
  function positions(count) {
    const maps={1:[[50,20]],2:[[50,22],[50,78]],3:[[18,22],[82,22],[50,82]],4:[[18,20],[82,20],[18,80],[82,80]],5:[[17,24],[50,14],[83,24],[30,82],[70,82]],6:[[18,16],[82,16],[18,50],[82,50],[18,84],[82,84]],7:[[18,12],[82,20],[18,37],[82,50],[18,63],[82,80],[18,88]],8:[[18,12],[82,12],[18,37],[82,37],[18,63],[82,63],[18,88],[82,88]],9:[[18,12],[18,31],[18,50],[18,69],[18,88],[82,15],[82,38],[82,62],[82,85]]};
    if (maps[count]) return maps[count];
    const leftCount=Math.ceil(count/2),rightCount=count-leftCount,points=[];
    for(let i=0;i<leftCount;i+=1)points.push([18,8+i*(84/Math.max(1,leftCount-1))]);
    for(let i=0;i<rightCount;i+=1)points.push([82,12+i*(76/Math.max(1,rightCount-1))]);
    return points;
  }
  function lines(points) { return `<svg class="canvas-lines" viewBox="0 0 100 100" preserveAspectRatio="none">${points.map(function(p){return `<line x1="50" y1="50" x2="${p[0]}" y2="${p[1]}"></line>`;}).join("")}</svg>`; }
  function query() { const i=location.hash.indexOf("?"); return new URLSearchParams(i>=0?location.hash.slice(i+1):""); }
  function route() { return location.hash.replace(/^#\/?/,"").split("?")[0]; }
  function findGroup(id) { return config.groups.find(function(group){return group.id===id;}); }
  function findItem(id) { for(const group of config.groups){const item=group.items.find(function(x){return x.id===id;});if(item)return {group:group,item:item};} return null; }
  function findNode(id) { for(const group of config.groups){for(const item of group.items){if(item.id===id)return {group:group,item:item,node:item};if(item.children){const node=item.children.find(function(x){return x.id===id;});if(node)return {group:group,item:item,node:node};}}}return null; }
  function layout(content, focused) { return `<div class="app-shell ${focused?"focus-shell":""}"><header class="topbar"><a class="brand" href="${focused?location.pathname+"#/":"index.html"}">${focused?"← 返回科目":"← 总览"}</a><span class="top-actions"><a class="log-link" href="plans.html">计划</a><a class="log-link" href="journal.html">日志</a><a class="subject-chip" href="subjects.html">科目</a></span></header><main>${content}</main></div>${activeId?sheet():""}`; }
  function summary(s) { return `<div class="map-summary"><span class="summary-overall"><small>${esc(config.name)}一轮</small><strong>${s.percent}%</strong></span><span><i class="dot level-1"></i><b>${s.sorted}</b><small>梳理</small></span><span><i class="dot level-2"></i><b>${s.practiced}</b><small>刷题</small></span><span><i class="dot level-3"></i><b>${s.reviewed}</b><small>复盘</small></span><span><b>${s.total}</b><small>单元</small></span></div>`; }
  function nodeDots(nodes){return nodes.map(function(node){return `<i class="matrix-dot status-bg-${level(node.id)}"></i>`;}).join("");}
  function home() {
    if(config.compactHierarchy)return compactHome();
    const allStats=stats(terminalNodes()), points=positions(config.groups.length);
    const nodes=config.groups.map(function(group,index){const terminal=group.items.reduce(function(a,item){return a.concat(finalNodes(item));},[]),s=stats(terminal),p=points[index];return `<a class="focus-node status-surface-${Math.ceil(s.percent/34)}" style="--x:${p[0]}%;--y:${p[1]}%" href="#/group?id=${encodeURIComponent(group.id)}"><small>${String(index+1).padStart(2,"0")}</small><strong>${esc(group.name)}</strong><span class="dot-matrix">${nodeDots(terminal)}</span></a>`;}).join("");
    return layout(`<section class="page subject-map-home">${summary(allStats)}<div class="focus-canvas subject-home-canvas ${config.groups.length===5?"five-node-canvas":config.groups.length>=6?"dense-canvas":""}">${lines(points)}<div class="focus-root"><small>${esc(config.source)}</small><strong>${esc(config.name)}</strong><b>${allStats.percent}%</b><span>${config.groups.length} 大类</span></div>${nodes}</div><div class="map-legend"><span><i class="status-bg-0"></i>未开始</span><span><i class="status-bg-1"></i>梳理</span><span><i class="status-bg-2"></i>刷题</span><span><i class="status-bg-3"></i>复盘</span></div></section>`,false);
  }
  function compactHome(){
    const q=query(),selected=findGroup(q.get("group"))||config.groups[0],allStats=stats(terminalNodes()),points=positions(selected.items.length);
    const tabs=config.groups.map(function(group){return `<a class="category-tab ${group.id===selected.id?"active":""}" href="#/?group=${encodeURIComponent(group.id)}">${esc(group.name)}</a>`;}).join("");
    const nodes=selected.items.map(function(item,index){const final=finalNodes(item),s=stats(final),p=points[index];return `<a class="focus-node status-surface-${Math.ceil(s.percent/34)}" style="--x:${p[0]}%;--y:${p[1]}%" href="#/item?id=${encodeURIComponent(item.id)}"><small>${esc(item.label||("第 "+(item.number||index+1)+" 章"))}</small><strong>${esc(item.name)}</strong><span>${s.percent}% · ${final.length} 模块</span></a>`;}).join("");
    return layout(`<section class="page compact-subject-home">${summary(allStats)}<div class="category-tabs">${tabs}</div><div class="focus-canvas compact-home-canvas ${selected.items.length===5?"five-node-canvas":selected.items.length>=6?"dense-canvas":""}">${lines(points)}<div class="focus-root"><small>知识大类</small><strong>${esc(selected.name)}</strong><b>${stats(selected.items.reduce(function(a,item){return a.concat(finalNodes(item));},[])).percent}%</b><span>${selected.items.length} 章</span></div>${nodes}</div><div class="map-legend"><span><i class="status-bg-0"></i>未开始</span><span><i class="status-bg-1"></i>梳理</span><span><i class="status-bg-2"></i>刷题</span><span><i class="status-bg-3"></i>复盘</span></div></section>`,false);
  }
  function groupPage(group) {
    const points=positions(group.items.length), nodes=group.items.map(function(item,index){const final=finalNodes(item),s=stats(final),p=points[index],hasChildren=!item.trackSelf&&item.children&&item.children.length,href=hasChildren?`#/item?id=${encodeURIComponent(item.id)}`:"#";return hasChildren?`<a class="focus-node status-surface-${Math.ceil(s.percent/34)}" style="--x:${p[0]}%;--y:${p[1]}%" href="${href}"><small>${String(index+1).padStart(2,"0")}</small><strong>${esc(item.name)}</strong><span>${s.percent}% · ${final.length} 模块</span></a>`:`<button class="focus-node status-surface-${level(item.id)}" style="--x:${p[0]}%;--y:${p[1]}%" data-node="${esc(item.id)}"><small>${String(index+1).padStart(2,"0")}</small><strong>${esc(item.name)}</strong><span>${levels[level(item.id)]}</span></button>`;}).join("");
    return layout(`<section class="page focus-page"><header class="focus-head"><a href="#/">${esc(config.name)}</a><span>›</span><strong>${esc(group.name)}</strong><em>${group.items.every(function(item){return finalNodes(item).length===1;})?"点击章节选择状态":"点击节点继续"}</em></header><div class="focus-canvas ${group.items.length===5?"five-node-canvas":group.items.length>=6?"dense-canvas":""}">${lines(points)}<div class="focus-root"><small>知识大类</small><strong>${esc(group.name)}</strong><b>${stats(group.items.reduce(function(a,i){return a.concat(finalNodes(i));},[])).percent}%</b><span>${group.items.length} 单元</span></div>${nodes}</div></section>`,true);
  }
  function itemPage(result) {
    const children=result.item.children, points=positions(children.length), s=stats(children), nodes=children.map(function(node,index){const p=points[index];return `<button class="focus-node status-surface-${level(node.id)}" style="--x:${p[0]}%;--y:${p[1]}%" data-node="${esc(node.id)}"><small>模块 ${String(index+1).padStart(2,"0")}</small><strong>${esc(node.name)}</strong><span>${levels[level(node.id)]}</span></button>`;}).join("");
    return layout(`<section class="page focus-page"><header class="focus-head"><a href="#/group?id=${encodeURIComponent(result.group.id)}">${esc(result.group.name)}</a><span>›</span><strong>${esc(result.item.name)}</strong><em>点击模块选择状态</em></header><div class="focus-canvas ${children.length===5?"five-node-canvas":children.length>=6?"dense-canvas":""}">${lines(points)}<div class="focus-root"><small>章节</small><strong>${esc(result.item.name)}</strong><b>${s.percent}%</b><span>${children.length} 模块</span></div>${nodes}</div></section>`,true);
  }
  function sheet(){const result=findNode(activeId),current=level(activeId);return `<div class="sheet-backdrop" data-close></div><section class="level-sheet"><div class="sheet-handle"></div><div class="sheet-head"><div><small>${esc(result.group.name)}</small><h2>${esc(result.node.name)}</h2></div><button data-close>×</button></div><a class="sheet-plan-link" href="plans.html?subject=${encodeURIComponent(config.id)}&target=${encodeURIComponent(result.node.id)}">为此单元制定计划 <span>设置完成日期 →</span></a><label class="log-note"><span>本次备注（可选）</span><textarea id="subject-note" maxlength="120"></textarea></label><div class="level-options">${levels.map(function(name,index){return `<button class="level-option status-${index} ${current===index?"selected":""}" data-level="${index}"><i>${index}</i><span><strong>${name}</strong><small>${index===0?"清除当前进度":index===1?"已完成内容梳理":index===2?"已完成针对性练习":"已完成错题与方法复盘"}</small></span></button>`;}).join("")}</div></section>`;}
  function render(){const r=route(),q=query();app.innerHTML=r==="group"?groupPage(findGroup(q.get("id"))||config.groups[0]):r==="item"&&findItem(q.get("id"))?itemPage(findItem(q.get("id"))):home();document.title=config.name+"一轮 | 一轮进度";}
  app.addEventListener("click",function(e){const t=e.target.closest("button,[data-close]");if(!t)return;if(t.dataset.node){activeId=t.dataset.node;render();}else if(t.dataset.level!==undefined&&activeId){const to=Number(t.dataset.level),from=level(activeId),result=findNode(activeId),note=document.getElementById("subject-note").value.trim(),now=new Date().toISOString();logs.push({id:"log-"+Date.now(),nodeId:activeId,path:result.group.name,name:result.node.name,fromLevel:from,toLevel:to,note:note,createdAt:now});save(config.logsKey,logs);if(to===0)delete records[activeId];else records[activeId]={level:to,updatedAt:now};save(config.recordsKey,records);activeId=null;render();}else if(t.hasAttribute("data-close")){activeId=null;render();}});
  addEventListener("hashchange",function(){activeId=null;render();});render();
})();
