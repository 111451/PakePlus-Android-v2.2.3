(function () {
  "use strict";

  const root = document.getElementById("dashboard");
  const TASKS_KEY = "review-tracker-daily-tasks-v1";
  const types = [
    { value: 1, name: "梳理", hint: "过知识与方法" },
    { value: 2, name: "刷题", hint: "完成针对练习" },
    { value: 3, name: "复盘", hint: "整理错题方法" }
  ];
  const masteryLevels = [
    { id: "weak", name: "不熟", hint: "明天再复盘", days: 1 },
    { id: "normal", name: "一般", hint: "3 天后复盘", days: 3 },
    { id: "strong", name: "熟练", hint: "7 天后复盘", days: 7 }
  ];
  const subjectMeta = {
    math: { name: "数学", recordsKey: "review-tracker-records-v1", logsKey: "review-tracker-logs-v1" },
    biology: { name: "生物" }, chemistry: { name: "化学" },
    chinese: { name: "语文", recordsKey: "review-tracker-chinese-records-v1", logsKey: "review-tracker-chinese-logs-v1" },
    physics: { name: "物理" }
  };
  const today = localDate(new Date());
  let tasks = read(TASKS_KEY, []);
  if (!Array.isArray(tasks)) tasks = [];
  let pickerOpen = false;
  let pickerEntering = false;
  let activeSubject = "math";
  let activeType = 1;
  let plannedDate = today;
  let search = "";
  let reviewTaskId = null;
  let reviewMastery = "normal";
  let reviewNote = "";

  function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch (error) { return fallback; } }
  function save(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (error) {} }
  function esc(value) { return String(value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;"); }
  function localDate(date) { return date.getFullYear()+"-"+String(date.getMonth()+1).padStart(2,"0")+"-"+String(date.getDate()).padStart(2,"0"); }
  function dateText() { const date=new Date(),week=["星期日","星期一","星期二","星期三","星期四","星期五","星期六"];return (date.getMonth()+1)+"月"+date.getDate()+"日 · "+week[date.getDay()]; }
  function offsetDate(days) { const date=new Date();date.setDate(date.getDate()+days);return localDate(date); }
  function shortDate(value) { const parts=value.split("-");return Number(parts[1])+"月"+Number(parts[2])+"日"; }
  function addCandidate(list, subject, node, path, group) { list.push({subject:subject,nodeId:node.id,name:node.name||node.title,path:path,group:group}); }

  function catalog() {
    const result={math:[],biology:[],chemistry:[],chinese:[],physics:[]};
    const math=window.KNOWLEDGE_TREE&&window.KNOWLEDGE_TREE.subjects[0];
    if(math)math.chapters.forEach(function(chapter){chapter.knowledgePoints.forEach(function(point){addCandidate(result.math,"math",point,chapter.name,chapter.name);});});
    const configs={biology:window.BIOLOGY_CONFIG,chemistry:window.CHEMISTRY_CONFIG,physics:window.PHYSICS_CONFIG};
    Object.keys(configs).forEach(function(subject){const config=configs[subject];if(!config)return;subjectMeta[subject].recordsKey=config.recordsKey;subjectMeta[subject].logsKey=config.logsKey;config.groups.forEach(function(group){group.items.forEach(function(item){if(!item.trackSelf&&item.children&&item.children.length){item.children.forEach(function(node){addCandidate(result[subject],subject,node,group.name+" · "+item.name,group.name);});}else{addCandidate(result[subject],subject,item,group.name,group.name);}});});});
    const chineseGroups={classical:"文言文",poetry:"诗词曲",textbook:"教材补充",standard:"课标补充"};
    (window.CHINESE_RECITATIONS||[]).forEach(function(work){const group=chineseGroups[work.group]||"古诗文";addCandidate(result.chinese,"chinese",{id:work.id,name:work.title},group,group);});
    return result;
  }

  const candidates=catalog();
  function todaysTasks(){return tasks.filter(function(task){return task.date===today;});}
  function taskType(value){return types.find(function(type){return type.value===value;})||types[0];}
  function isAdded(candidate){return tasks.some(function(task){return task.date===plannedDate&&task.subject===candidate.subject&&task.nodeId===candidate.nodeId&&task.type===activeType;});}

  function renderTask(task){const meta=subjectMeta[task.subject];return `<article class="today-task ${task.done?"done":""}"><button class="task-check" type="button" data-toggle="${esc(task.id)}" aria-label="${task.done?"恢复任务":"完成任务"}"><i></i></button><div class="task-copy"><span><b class="task-subject subject-${task.subject}">${esc(meta.name)}</b><em>· ${esc(taskType(task.type).name)}</em></span><strong>${esc(task.name)}</strong><small>${esc(task.path)}</small></div><button class="task-more" type="button" data-remove="${esc(task.id)}" aria-label="删除任务">×</button></article>`;}

  function renderOverdueTask(task){return `<article class="overdue-task"><div class="overdue-copy"><span><b class="task-subject subject-${task.subject}">${esc(subjectMeta[task.subject].name)}</b><em>${shortDate(task.date)} · ${esc(taskType(task.type).name)}</em></span><strong>${esc(task.name)}</strong></div><div class="overdue-actions"><button type="button" data-move-today="${esc(task.id)}">移到今天</button><label>改期<input type="date" min="${today}" value="${today}" data-reschedule="${esc(task.id)}"></label><button type="button" class="abandon" data-abandon="${esc(task.id)}">放弃</button></div></article>`;}

  function renderPicker(){
    if(!pickerOpen)return "";
    const keyword=search.trim().toLowerCase(),visible=candidates[activeSubject].filter(function(item){return !keyword||(item.name+item.path).toLowerCase().includes(keyword);}),groups=[];
    visible.forEach(function(item){let group=groups.find(function(entry){return entry.name===item.group;});if(!group){group={name:item.group,items:[]};groups.push(group);}group.items.push(item);});
    const content=groups.map(function(group){return `<section class="picker-group"><h3>${esc(group.name)}</h3>${group.items.map(function(item){const added=isAdded(item);return `<button type="button" class="picker-item ${added?"added":""}" data-add-subject="${item.subject}" data-add-node="${esc(item.nodeId)}" ${added?"disabled":""}><span><strong>${esc(item.name)}</strong><small>${esc(item.path)}</small></span><b>${added?"已添加":"+"}</b></button>`;}).join("")}</section>`;}).join("");
    const entering=pickerEntering?" entering":"";
    return `<div class="task-picker-backdrop${entering}" data-close-picker></div><section class="task-picker${entering}" aria-modal="true" role="dialog"><header><span><small>从现有目录选择</small><h2>添加任务</h2></span><button type="button" data-close-picker>×</button></header><div class="picker-types">${types.map(function(type){return `<button type="button" class="${activeType===type.value?"active":""}" data-type="${type.value}"><strong>${type.name}</strong><small>${type.hint}</small></button>`;}).join("")}</div><div class="picker-date"><span><small>安排日期</small><strong>${plannedDate===today?"今天":plannedDate===offsetDate(1)?"明天":shortDate(plannedDate)}</strong></span><div><button type="button" class="${plannedDate===today?"active":""}" data-date="${today}">今天</button><button type="button" class="${plannedDate===offsetDate(1)?"active":""}" data-date="${offsetDate(1)}">明天</button><input type="date" min="${today}" value="${plannedDate}" aria-label="选择任务日期"></div></div><nav class="picker-subjects">${Object.keys(subjectMeta).map(function(id){return `<button type="button" class="${activeSubject===id?"active":""}" data-subject="${id}">${subjectMeta[id].name}</button>`;}).join("")}</nav><label class="picker-search"><span>⌕</span><input type="search" placeholder="搜索章节或模块" value="${esc(search)}"></label><div class="picker-directory">${content||'<div class="picker-empty">没有找到相关内容</div>'}</div></section>`;
  }

  function renderFutureTask(task){return `<article class="future-task"><time>${shortDate(task.date)}</time><div><span><b class="task-subject subject-${task.subject}">${esc(subjectMeta[task.subject].name)}</b><em>· ${esc(taskType(task.type).name)}</em></span><strong>${esc(task.name)}</strong></div><button type="button" data-remove="${esc(task.id)}" aria-label="删除任务">×</button></article>`;}

  function renderReviewSheet(){
    if(!reviewTaskId)return "";
    const task=tasks.find(function(item){return item.id===reviewTaskId;});
    if(!task)return "";
    const selected=masteryLevels.find(function(item){return item.id===reviewMastery;})||masteryLevels[1];
    return `<div class="review-backdrop" data-close-review></div><section class="review-sheet" role="dialog" aria-modal="true"><div class="review-handle"></div><header><div><small>${esc(subjectMeta[task.subject].name)} · ${esc(taskType(task.type).name)}</small><h2>${esc(task.name)}</h2></div><button type="button" data-close-review>×</button></header><div class="mastery-options">${masteryLevels.map(function(item){return `<button type="button" class="mastery-${item.id} ${reviewMastery===item.id?"active":""}" data-mastery="${item.id}"><strong>${item.name}</strong><small>${item.hint}</small></button>`;}).join("")}</div><label class="review-note"><span>本次备注 <small>可选，写卡点或错因</small></span><textarea maxlength="160" placeholder="例如：受力分析漏掉摩擦力">${esc(reviewNote)}</textarea></label><div class="review-next"><span>确认后自动安排</span><strong>${shortDate(offsetDate(selected.days))} · 复盘</strong></div><button type="button" class="review-confirm" data-confirm-review>完成任务并安排复盘</button></section>`;
  }

  function render(){
    const current=todaysTasks(),overdue=tasks.filter(function(task){return task.date<today&&!task.done&&!task.abandoned;}).sort(function(a,b){return a.date.localeCompare(b.date);}),future=tasks.filter(function(task){return task.date>today&&!task.abandoned;}).sort(function(a,b){return a.date.localeCompare(b.date);}),completed=current.filter(function(task){return task.done;}).length,percent=current.length?Math.round(completed/current.length*100):0;
    root.innerHTML=`<div class="app-shell today-shell"><header class="topbar"><strong class="brand">一轮进度</strong><span class="top-actions"><a class="log-link" href="journal.html">复习日志</a><a class="subject-chip" href="subjects.html">全部科目</a></span></header><main class="today-page"><section class="today-hero"><div><p class="eyebrow">TODAY'S FOCUS</p><h1>今日任务台</h1><span>${dateText()}</span></div><div class="today-score"><strong>${completed}<small> / ${current.length}</small></strong><span>今日完成</span></div></section><section class="today-progress"><div><i style="width:${percent}%"></i></div><span>${current.length?percent+"%":"先选好今天要推进的内容"}</span></section>${overdue.length?`<section class="overdue-section"><header><div><small>NEEDS ACTION</small><h2>逾期任务</h2></div><b>${overdue.length} 项待处理</b></header><div>${overdue.map(renderOverdueTask).join("")}</div></section>`:""}<section class="today-list-head"><div><h2>任务清单</h2><span>${current.length?"专注完成今天，不追赶总进度":"今天准备学什么？"}</span></div><button type="button" data-open-picker>＋ 添加任务</button></section><section class="today-list">${current.length?current.map(renderTask).join(""):'<div class="today-empty"><span>01</span><strong>从科目目录挑选任务</strong><p>选一个章节或模块，今天只管把它推进一步。</p><button type="button" data-open-picker>选择第一个任务</button></div>'}</section>${completed&&completed===current.length?'<section class="today-finished"><small>DAY COMPLETE</small><strong>今天的任务已全部完成</strong><span>可以收工，也可以再加一项。</span></section>':""}${future.length?`<section class="future-section"><header><div><h2>未来安排</h2><span>到日期后自动进入今日清单</span></div><b>${future.length} 项</b></header><div>${future.map(renderFutureTask).join("")}</div></section>`:""}</main></div>${renderPicker()}${renderReviewSheet()}`;
    pickerEntering=false;
  }

  function updateSubjectProgress(task){
    const meta=subjectMeta[task.subject];if(!meta.recordsKey)return;const records=read(meta.recordsKey,{}),now=new Date().toISOString();
    if(task.subject==="chinese"){const key="round-1:"+task.nodeId,old=records[key]&&Number.isInteger(records[key].stage)?records[key].stage:0;records[key]={stage:Math.max(old,task.type),updatedAt:now};save(meta.recordsKey,records);return;}
    const old=records[task.nodeId]&&Number.isInteger(records[task.nodeId].level)?records[task.nodeId].level:0,to=Math.max(old,task.type);records[task.nodeId]={level:to,updatedAt:now};save(meta.recordsKey,records);
  }

  function writeTaskLog(task, now, mastery, note){
    const meta=subjectMeta[task.subject];
    if(!meta.logsKey||task.loggedAt)return;
    const logs=read(meta.logsKey,[]),type=taskType(task.type),masteryName=(masteryLevels.find(function(item){return item.id===mastery;})||masteryLevels[1]).name;
    logs.push({id:"task-log-"+task.id,nodeId:task.nodeId,path:task.path,name:task.name,fromLevel:Math.max(0,task.type-1),toLevel:task.type,note:"掌握："+masteryName+(note?" · "+note:""),createdAt:now});
    save(meta.logsKey,logs);
    task.loggedAt=now;
  }

  function scheduleReview(task, mastery){
    const level=masteryLevels.find(function(item){return item.id===mastery;})||masteryLevels[1],date=offsetDate(level.days);
    const exists=tasks.some(function(item){return !item.abandoned&&item.date===date&&item.subject===task.subject&&item.nodeId===task.nodeId&&item.type===3;});
    if(!exists)tasks.push({id:"task-"+Date.now()+"-review",date:date,subject:task.subject,nodeId:task.nodeId,name:task.name,path:task.path,type:3,done:false,completedAt:"",autoReview:true,masterySource:mastery});
  }

  function completeTaskChain(task, mastery, note){
    const now=new Date().toISOString();
    tasks.forEach(function(item){
      if(item.date===task.date&&item.subject===task.subject&&item.nodeId===task.nodeId&&item.type<=task.type){item.done=true;item.completedAt=item.completedAt||now;item.mastery=mastery;item.note=note;writeTaskLog(item,now,mastery,note);}
    });
    updateSubjectProgress(task);
    scheduleReview(task,mastery);
  }

  root.addEventListener("click",function(event){
    const button=event.target.closest("button,[data-close-picker],[data-close-review]");if(!button)return;
    if(button.hasAttribute("data-open-picker")){pickerOpen=true;pickerEntering=true;render();return;}if(button.hasAttribute("data-close-picker")){pickerOpen=false;search="";render();return;}if(button.hasAttribute("data-close-review")){reviewTaskId=null;reviewNote="";render();return;}if(button.dataset.subject){activeSubject=button.dataset.subject;search="";render();return;}if(button.dataset.type){activeType=Number(button.dataset.type);render();return;}if(button.dataset.date){plannedDate=button.dataset.date;render();return;}if(button.dataset.mastery){reviewMastery=button.dataset.mastery;render();return;}
    if(button.dataset.addNode){const candidate=candidates[button.dataset.addSubject].find(function(item){return item.nodeId===button.dataset.addNode;});if(candidate&&!isAdded(candidate)){tasks.push({id:"task-"+Date.now(),date:plannedDate,subject:candidate.subject,nodeId:candidate.nodeId,name:candidate.name,path:candidate.path,type:activeType,done:false,completedAt:""});save(TASKS_KEY,tasks);render();}return;}
    if(button.dataset.toggle){const task=tasks.find(function(item){return item.id===button.dataset.toggle;});if(task){if(task.done){task.done=false;task.completedAt="";save(TASKS_KEY,tasks);render();}else{reviewTaskId=task.id;reviewMastery="normal";reviewNote="";render();}}return;}
    if(button.hasAttribute("data-confirm-review")){const task=tasks.find(function(item){return item.id===reviewTaskId;});if(task){completeTaskChain(task,reviewMastery,reviewNote.trim());save(TASKS_KEY,tasks);}reviewTaskId=null;reviewNote="";render();return;}
    if(button.dataset.moveToday){const task=tasks.find(function(item){return item.id===button.dataset.moveToday;});if(task){task.date=today;save(TASKS_KEY,tasks);render();}return;}
    if(button.dataset.abandon){const task=tasks.find(function(item){return item.id===button.dataset.abandon;});if(task){task.abandoned=true;task.abandonedAt=new Date().toISOString();save(TASKS_KEY,tasks);render();}return;}
    if(button.dataset.remove){tasks=tasks.filter(function(item){return item.id!==button.dataset.remove;});save(TASKS_KEY,tasks);render();}
  });
  root.addEventListener("input",function(event){if(event.target.matches(".review-note textarea")){reviewNote=event.target.value;return;}if(!event.target.matches(".picker-search input"))return;search=event.target.value;render();const input=root.querySelector(".picker-search input");if(input){input.focus();input.setSelectionRange(search.length,search.length);}});
  root.addEventListener("change",function(event){if(event.target.matches('[data-reschedule]')){const task=tasks.find(function(item){return item.id===event.target.dataset.reschedule;});if(task&&event.target.value>=today){task.date=event.target.value;save(TASKS_KEY,tasks);render();}return;}if(!event.target.matches('.picker-date input[type="date"]'))return;if(event.target.value>=today){plannedDate=event.target.value;render();}});
  render();
})();
