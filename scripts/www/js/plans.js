(function () {
  "use strict";
  const app = document.getElementById("plans-app");
  const KEY = "review-tracker-plans-v1";
  const priorities = { high:{name:"高",rank:3}, medium:{name:"中",rank:2}, low:{name:"低",rank:1} };
  const subjectNames = { math:"数学", biology:"生物", chemistry:"化学", chinese:"语文" };
  let plans = read();
  let filter = "active";

  function read() { try { const value=JSON.parse(localStorage.getItem(KEY)||"[]"); return Array.isArray(value)?value:[]; } catch(e) { return []; } }
  function save() { try { localStorage.setItem(KEY,JSON.stringify(plans)); } catch(e) {} }
  function esc(value) { return String(value||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;"); }
  function addTarget(all,subject,id,name,path,scope) { all.push({key:subject+"|"+id,subject:subject,id:id,name:name,path:path,scope:scope}); }
  function buildTargets() {
    const all=[];
    const math=window.KNOWLEDGE_TREE.subjects[0];
    addTarget(all,"math","math",math.name,"数学","subject");
    math.chapters.forEach(function(chapter){
      const chapterName=chapter.name.replace(/^第\s*\d+\s*章\s*/,"");
      addTarget(all,"math",chapter.id,chapterName,"数学","section");
      chapter.knowledgePoints.forEach(function(point){addTarget(all,"math",point.id,point.name,"数学 · "+chapterName,"unit");});
    });
    [["biology",window.BIOLOGY_CONFIG],["chemistry",window.CHEMISTRY_CONFIG]].forEach(function(entry){
      const subject=entry[0],config=entry[1];
      addTarget(all,subject,subject,config.name,config.name,"subject");
      config.groups.forEach(function(group){
        addTarget(all,subject,group.id,group.name,config.name,"section");
        group.items.forEach(function(item){
          addTarget(all,subject,item.id,item.name,config.name+" · "+group.name,item.trackSelf||!item.children||!item.children.length?"unit":"section");
          if(!item.trackSelf&&item.children)item.children.forEach(function(node){addTarget(all,subject,node.id,node.name,config.name+" · "+item.name,"unit");});
        });
      });
    });
    addTarget(all,"chinese","chinese","语文背诵","语文","subject");
    const chineseGroups={classical:"文言文",poetry:"诗词曲",textbook:"教材补充",standard:"课标补充"};
    Object.keys(chineseGroups).forEach(function(id){addTarget(all,"chinese","chinese-"+id,chineseGroups[id],"语文背诵","section");});
    window.CHINESE_RECITATIONS.forEach(function(work){addTarget(all,"chinese",work.id,work.title,"语文 · "+chineseGroups[work.group],"unit");});
    return all;
  }
  const targets=buildTargets();
  function localDate(date) { return date.getFullYear()+"-"+String(date.getMonth()+1).padStart(2,"0")+"-"+String(date.getDate()).padStart(2,"0"); }
  function dayDiff(date) { const today=new Date();today.setHours(0,0,0,0);return Math.round((new Date(date+"T00:00:00")-today)/86400000); }
  function dateMeta(date,completed) { const diff=dayDiff(date);if(completed)return {group:"已完成",text:date,kind:"done"};if(diff<0)return {group:"已逾期",text:"逾期 "+Math.abs(diff)+" 天",kind:"overdue"};if(diff===0)return {group:"今天",text:"今天完成",kind:"today"};if(diff<=7)return {group:"未来 7 天",text:"还剩 "+diff+" 天",kind:"soon"};return {group:"之后",text:date,kind:"later"}; }
  function targetOptions(subject,selected) { return targets.filter(function(t){return t.subject===subject;}).map(function(t){const prefix=t.scope==="subject"?"科目":t.scope==="section"?"章节/分类":"复习单元";return `<option value="${esc(t.key)}" ${t.key===selected?"selected":""}>[${prefix}] ${esc(t.path===t.name?t.name:t.path+" · "+t.name)}</option>`;}).join(""); }
  function form() {
    const q=new URLSearchParams(location.search),requestedSubject=q.get("subject"),subject=subjectNames[requestedSubject]?requestedSubject:"math",requestedKey=subject+"|"+(q.get("target")||subject),selected=targets.some(function(t){return t.key===requestedKey;})?requestedKey:subject+"|"+subject;
    return `<form class="plan-form" id="plan-form"><header><div><p class="eyebrow">NEW PLAN</p><h2>制定计划</h2></div><span>选择范围与目标日期</span></header><div class="plan-form-grid"><label><span>科目</span><select id="plan-subject">${Object.keys(subjectNames).map(function(id){return `<option value="${id}" ${id===subject?"selected":""}>${subjectNames[id]}</option>`;}).join("")}</select></label><label class="plan-target-field"><span>计划对象</span><select id="plan-target">${targetOptions(subject,selected)}</select></label><label><span>目标完成日期</span><input id="plan-date" type="date" min="${localDate(new Date())}" required></label><label><span>优先级</span><select id="plan-priority"><option value="high">高优先级</option><option value="medium" selected>中优先级</option><option value="low">低优先级</option></select></label></div><button class="plan-submit" type="submit">加入计划</button></form>`;
  }
  function renderList() {
    const visible=plans.filter(function(plan){return filter==="all"||filter==="done"?filter==="all"||plan.completed:!plan.completed;}).sort(function(a,b){return Number(a.completed)-Number(b.completed)||a.dueDate.localeCompare(b.dueDate)||priorities[b.priority].rank-priorities[a.priority].rank;});
    const groups={};visible.forEach(function(plan){const meta=dateMeta(plan.dueDate,plan.completed);(groups[meta.group]||(groups[meta.group]=[])).push({plan:plan,meta:meta});});
    const order=["已逾期","今天","未来 7 天","之后","已完成"];
    return order.map(function(group){if(!groups[group])return "";return `<section class="plan-group"><header><h2>${group}</h2><span>${groups[group].length} 项</span></header><div class="plan-list">${groups[group].map(function(entry){const p=entry.plan,m=entry.meta;return `<article class="plan-card ${p.completed?"completed":""}"><button class="plan-check" data-toggle="${esc(p.id)}" aria-label="${p.completed?"恢复计划":"完成计划"}">${p.completed?"✓":""}</button><div class="plan-copy"><span class="plan-path">${esc(subjectNames[p.subject])} · ${esc(p.path)}</span><strong>${esc(p.name)}</strong><p><i class="priority-${p.priority}">${priorities[p.priority].name}优先级</i><b class="date-${m.kind}">${esc(m.text)}</b></p></div><button class="plan-delete" data-delete="${esc(p.id)}" aria-label="删除计划">×</button></article>`;}).join("")}</div></section>`;}).join("")||`<div class="plans-empty"><strong>这里还没有计划</strong><span>设置一个目标完成日期，开始安排一轮复习。</span></div>`;
  }
  function render() {
    const active=plans.filter(function(p){return !p.completed;}).length,overdue=plans.filter(function(p){return !p.completed&&dayDiff(p.dueDate)<0;}).length;
    app.innerHTML=`<div class="app-shell plans-shell"><header class="topbar"><a class="brand" href="index.html">← 总览</a><span class="top-actions"><a class="log-link" href="journal.html">日志</a><span class="subject-chip">计划</span></span></header><main class="page plans-page"><header class="plans-head"><div><p class="eyebrow">STUDY PLANNER</p><h1>复习计划</h1><small>跨科安排目标完成日期</small></div><strong>${active}<small> 项进行中</small>${overdue?`<em>${overdue} 项逾期</em>`:""}</strong></header>${form()}<nav class="plan-filters">${[["active","进行中"],["done","已完成"],["all","全部"]].map(function(item){return `<button data-filter="${item[0]}" class="${filter===item[0]?"active":""}">${item[1]}</button>`;}).join("")}</nav><div id="plan-groups">${renderList()}</div></main></div>`;
  }
  app.addEventListener("change",function(e){if(e.target.id==="plan-subject"){document.getElementById("plan-target").innerHTML=targetOptions(e.target.value,e.target.value+"|"+e.target.value);}});
  app.addEventListener("submit",function(e){if(e.target.id!=="plan-form")return;e.preventDefault();const target=targets.find(function(t){return t.key===document.getElementById("plan-target").value;});if(!target)return;plans.push({id:"plan-"+Date.now()+"-"+Math.random().toString(36).slice(2,6),subject:target.subject,targetId:target.id,name:target.name,path:target.path,scope:target.scope,dueDate:document.getElementById("plan-date").value,priority:document.getElementById("plan-priority").value,completed:false,createdAt:new Date().toISOString()});save();history.replaceState(null,"",location.pathname);render();});
  app.addEventListener("click",function(e){const target=e.target.closest("button");if(!target)return;if(target.dataset.filter){filter=target.dataset.filter;render();}else if(target.dataset.toggle){const plan=plans.find(function(p){return p.id===target.dataset.toggle;});if(plan){plan.completed=!plan.completed;plan.completedAt=plan.completed?new Date().toISOString():"";save();render();}}else if(target.dataset.delete){plans=plans.filter(function(p){return p.id!==target.dataset.delete;});save();render();}});
  render();
})();
