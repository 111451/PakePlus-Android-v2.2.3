(function () {
  "use strict";

  const app = document.getElementById("chinese-app");
  const works = window.CHINESE_RECITATIONS;
  const RECORDS_KEY = "review-tracker-chinese-records-v1";
  const ROUND_KEY = "review-tracker-chinese-round-v1";
  const groups = [
    { id: "classical", name: "文言文", note: "20 篇" },
    { id: "poetry", name: "诗词曲", note: "40 首" },
    { id: "textbook", name: "教材补充", note: "1 篇" },
    { id: "standard", name: "课标补充", note: "12 篇" }
  ];
  const stages = [
    { value: 0, label: "待背", hint: "尚未开始本轮背诵" },
    { value: 1, label: "在背", hint: "正在熟悉和背诵" },
    { value: 2, label: "已背", hint: "能够完整背诵" },
    { value: 3, label: "已默写", hint: "已完成默写检查" }
  ];
  let records = readJson(RECORDS_KEY, {});
  let round = Number(localStorage.getItem(ROUND_KEY)) || 1;
  let filter = "all";
  let search = "";
  let activeWorkId = null;

  function readJson(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function saveRecords() {
    try {
      localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
      localStorage.setItem(ROUND_KEY, String(round));
    } catch (error) {
      // The list remains usable when storage is unavailable.
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function key(workId) {
    return "round-" + round + ":" + workId;
  }

  function getRecord(workId) {
    return records[key(workId)] || { stage: 0, updatedAt: "" };
  }

  function formatDate(iso) {
    if (!iso) return "";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    return (date.getMonth() + 1) + "月" + date.getDate() + "日";
  }

  function statsFor(items) {
    const counts = [0, 0, 0, 0];
    items.forEach(function (work) { counts[getRecord(work.id).stage] += 1; });
    const completed = counts[2] + counts[3];
    return { counts: counts, completed: completed, percent: items.length ? Math.round(completed / items.length * 100) : 0 };
  }

  function visibleWorks() {
    const keyword = search.trim().toLowerCase();
    return works.filter(function (work) {
      const stage = getRecord(work.id).stage;
      const filterMatches = filter === "all" || filter === "unfinished" && stage < 2 || filter === "done" && stage >= 2;
      const searchMatches = !keyword || (work.title + work.author).toLowerCase().includes(keyword);
      return filterMatches && searchMatches;
    });
  }

  function renderSummary() {
    const stats = statsFor(works);
    return `
      <section class="chinese-summary">
        <div class="chinese-summary-main"><span>第 ${round} 轮背诵</span><strong>${stats.percent}<small>%</small></strong><p>${stats.completed} / ${works.length} 篇已背</p></div>
        <div class="recitation-ring" style="--progress:${stats.percent * 3.6}deg"><span>${stats.percent}%</span></div>
        <div class="chinese-stage-counts">
          ${stages.map(function (stage) { return `<span><i class="recite-dot recite-${stage.value}"></i><b>${stats.counts[stage.value]}</b><small>${stage.label}</small></span>`; }).join("")}
        </div>
      </section>`;
  }

  function renderWork(work) {
    const record = getRecord(work.id);
    return `
      <button class="recitation-item stage-${record.stage}" type="button" data-work="${work.id}">
        <span class="recitation-number">${String(works.indexOf(work) + 1).padStart(2, "0")}</span>
        <span class="recitation-copy"><strong>${escapeHtml(work.title)}</strong><small>${escapeHtml(work.author || "课标篇目")} · P${work.page}${record.updatedAt ? " · " + formatDate(record.updatedAt) : ""}</small></span>
        <span class="recitation-status recite-status-${record.stage}">${stages[record.stage].label}</span>
      </button>`;
  }

  function renderGroups() {
    const visible = visibleWorks();
    const content = groups.map(function (group) {
      const items = visible.filter(function (work) { return work.group === group.id; });
      if (!items.length) return "";
      const allGroupWorks = works.filter(function (work) { return work.group === group.id; });
      const stats = statsFor(allGroupWorks);
      return `
        <section class="recitation-group">
          <header><div><h2>${group.name}</h2><span>${group.note}</span></div><b>${stats.completed}/${allGroupWorks.length}</b></header>
          <div class="recitation-list">${items.map(renderWork).join("")}</div>
        </section>`;
    }).join("");
    return content || `<div class="recitation-empty"><strong>没有符合条件的篇目</strong><span>换一个关键词或筛选条件试试。</span></div>`;
  }

  function renderSheet() {
    if (!activeWorkId) return "";
    const work = works.find(function (item) { return item.id === activeWorkId; });
    if (!work) return "";
    const record = getRecord(work.id);
    return `
      <div class="sheet-backdrop" data-action="close-sheet"></div>
      <section class="level-sheet recitation-sheet" role="dialog" aria-modal="true" aria-label="记录背诵进度">
        <div class="sheet-handle"></div>
        <div class="sheet-head"><div><small>第 ${round} 轮 · ${escapeHtml(work.author || "古诗文背诵")}</small><h2>${escapeHtml(work.title)}</h2></div><button type="button" data-action="close-sheet" aria-label="关闭">×</button></div>
        <a class="sheet-plan-link" href="plans.html?subject=chinese&target=${encodeURIComponent(work.id)}">为此篇目制定计划 <span>设置完成日期 →</span></a>
        <div class="level-options">
          ${stages.map(function (stage) {
            return `<button class="level-option recitation-option status-${stage.value} ${record.stage === stage.value ? "selected" : ""}" type="button" data-stage="${stage.value}"><i>${stage.value}</i><span><strong>${stage.label}</strong><small>${stage.hint}</small></span>${record.stage === stage.value ? "<b>当前</b>" : ""}</button>`;
          }).join("")}
        </div>
      </section>`;
  }

  function render() {
    app.innerHTML = `
      <div class="app-shell chinese-shell">
        <header class="topbar"><a class="brand" href="index.html">← 总览</a><span class="top-actions"><a class="log-link" href="plans.html">计划</a><a class="subject-chip" href="subjects.html">科目</a></span></header>
        <main class="page chinese-page">
          <header class="chinese-head"><div><p class="eyebrow">RECITATION</p><h1>语文背诵</h1><p>每轮独立记录，已背或已默写计入完成。</p></div><label class="round-picker"><span>背诵轮次</span><select id="round-select" aria-label="选择背诵轮次">${[1, 2, 3].map(function (item) { return `<option value="${item}" ${item === round ? "selected" : ""}>第 ${item} 轮</option>`; }).join("")}</select></label></header>
          ${renderSummary()}
          <section class="recitation-tools">
            <input id="recitation-search" type="search" value="${escapeHtml(search)}" placeholder="搜索篇目或作者" aria-label="搜索篇目或作者">
            <div class="recitation-filters">${[["all", "全部"], ["unfinished", "未完成"], ["done", "已完成"]].map(function (item) { return `<button class="${filter === item[0] ? "active" : ""}" type="button" data-filter="${item[0]}">${item[1]}</button>`; }).join("")}</div>
          </section>
          <div id="recitation-groups">${renderGroups()}</div>
        </main>
      </div>
      ${renderSheet()}`;
  }

  app.addEventListener("click", function (event) {
    const target = event.target.closest("button, [data-action]");
    if (!target) return;
    if (target.dataset.work) {
      activeWorkId = target.dataset.work;
      render();
    } else if (target.dataset.stage !== undefined && activeWorkId) {
      const stage = Number(target.dataset.stage);
      if (stage === 0) delete records[key(activeWorkId)];
      else records[key(activeWorkId)] = { stage: stage, updatedAt: new Date().toISOString() };
      activeWorkId = null;
      saveRecords();
      render();
    } else if (target.dataset.filter) {
      filter = target.dataset.filter;
      render();
    } else if (target.dataset.action === "close-sheet") {
      activeWorkId = null;
      render();
    }
  });

  app.addEventListener("change", function (event) {
    if (event.target.id !== "round-select") return;
    round = Number(event.target.value);
    saveRecords();
    render();
  });

  app.addEventListener("input", function (event) {
    if (event.target.id !== "recitation-search") return;
    search = event.target.value;
    document.getElementById("recitation-groups").innerHTML = renderGroups();
  });

  render();
})();
