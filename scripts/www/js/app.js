(function () {
  "use strict";

  const app = document.getElementById("app");
  const subject = window.KNOWLEDGE_TREE.subjects[0];
  const RECORDS_KEY = "review-tracker-records-v1";
  const VIEW_KEY = "review-tracker-view-v1";
  const LOGS_KEY = "review-tracker-logs-v1";
  const levels = [
    { value: 0, label: "未开始", short: "未开始" },
    { value: 1, label: "已梳理", short: "梳理" },
    { value: 2, label: "已刷题", short: "刷题" },
    { value: 3, label: "已复盘", short: "复盘" }
  ];

  let records = readJson(RECORDS_KEY, {});
  let viewState = readJson(VIEW_KEY, { chapters: {}, modules: {} });
  let logs = readJson(LOGS_KEY, []);
  if (!Array.isArray(logs)) logs = [];
  let activePointId = null;

  function readJson(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function saveJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      // Browsing still works when storage is unavailable.
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

  function getLevel(pointId) {
    const record = records[pointId];
    return record && Number.isInteger(record.level) ? record.level : 0;
  }

  function allPoints(chapter) {
    return chapter
      ? chapter.knowledgePoints
      : subject.chapters.reduce(function (points, item) {
          return points.concat(item.knowledgePoints);
        }, []);
  }

  function getStats(points) {
    const exact = [0, 0, 0, 0];
    points.forEach(function (point) { exact[getLevel(point.id)] += 1; });
    const score = points.reduce(function (total, point) { return total + getLevel(point.id); }, 0);
    const maximum = points.length * 3;
    return {
      total: points.length,
      exact: exact,
      sorted: exact[1] + exact[2] + exact[3],
      practiced: exact[2] + exact[3],
      reviewed: exact[3],
      percent: maximum ? Math.round(score / maximum * 100) : 0
    };
  }

  function getModules(chapter) {
    const modules = [];
    chapter.knowledgePoints.forEach(function (point) {
      let module = modules.find(function (item) { return item.name === point.module; });
      if (!module) {
        module = { id: chapter.id + "-module-" + modules.length, name: point.module, points: [] };
        modules.push(module);
      }
      module.points.push(point);
    });
    return modules;
  }

  function cleanChapterName(name) {
    return name.replace(/^第\s*\d+\s*章\s*/, "");
  }

  function formatTime(iso) {
    if (!iso) return "";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    return (date.getMonth() + 1) + "月" + date.getDate() + "日 " + String(date.getHours()).padStart(2, "0") + ":" + String(date.getMinutes()).padStart(2, "0");
  }

  function progressBar(stats, labelled) {
    const total = stats.total || 1;
    return `
      <div class="progress-track" ${labelled ? 'aria-label="复习等级分布"' : ""}>
        <span class="progress-segment level-3" style="width:${stats.exact[3] / total * 100}%"></span>
        <span class="progress-segment level-2" style="width:${stats.exact[2] / total * 100}%"></span>
        <span class="progress-segment level-1" style="width:${stats.exact[1] / total * 100}%"></span>
      </div>
    `;
  }

  function layout(content, activeNav) {
    const focused = activeNav === "focus";
    return `
      <div class="app-shell ${focused ? "focus-shell" : ""}">
        <header class="topbar">
          <a class="brand" href="${focused ? "#/" : "index.html"}">${focused ? "← 返回数学" : "← 总览"}</a>
          <span class="top-actions"><a class="log-link" href="plans.html">计划</a><a class="subject-chip" href="subjects.html">科目</a><a class="log-link ${activeNav === "logs" ? "active" : ""}" href="#/logs">日志</a></span>
        </header>
        <main>${content}</main>
      </div>
      ${activePointId ? renderLevelSheet(activePointId) : ""}
    `;
  }

  function canvasPositions(count) {
    const layouts = {
      1: [[50, 20]],
      2: [[50, 22], [50, 78]],
      3: [[20, 24], [80, 24], [50, 82]],
      4: [[20, 22], [80, 22], [20, 80], [80, 80]],
      5: [[17, 24], [50, 14], [83, 24], [30, 82], [70, 82]],
      6: [[18, 18], [82, 18], [18, 50], [82, 50], [18, 82], [82, 82]],
      7: [[18, 12], [82, 20], [18, 37], [82, 50], [18, 63], [82, 80], [18, 88]],
      8: [[18, 12], [82, 12], [18, 37], [82, 37], [18, 63], [82, 63], [18, 88], [82, 88]]
    };
    return layouts[count] || layouts[7];
  }

  function canvasLines(positions) {
    return `<svg class="canvas-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${positions.map(function (position) {
      return `<line x1="50" y1="50" x2="${position[0]}" y2="${position[1]}"></line>`;
    }).join("")}</svg>`;
  }

  function renderHome() {
    const stats = getStats(allPoints());
    const chapterPositions = subject.chapters.map(function (chapter) {
      return [chapter.order % 2 === 1 ? 17 : 83, 7.5 + (Math.ceil(chapter.order / 2) - 1) * 17];
    });
    const chapters = subject.chapters.map(function (chapter) {
      const chapterStats = getStats(chapter.knowledgePoints);
      const dots = chapter.knowledgePoints.map(function (point) {
        return `<i class="matrix-dot status-bg-${getLevel(point.id)}" title="${escapeHtml(point.name)}"></i>`;
      }).join("");
      const position = chapterPositions[chapter.order - 1];
      return `
        <a class="home-map-node focus-node shade-${Math.ceil(chapterStats.percent / 34)}" style="--x:${position[0]}%;--y:${position[1]}%" href="#/directory?chapter=${encodeURIComponent(chapter.id)}">
          <span class="map-node-head"><b>${String(chapter.order).padStart(2, "0")}</b><em>${chapterStats.percent}%</em></span>
          <strong class="map-node-title">${escapeHtml(cleanChapterName(chapter.name))}</strong>
          <span class="dot-matrix">${dots}</span>
        </a>
      `;
    }).join("");

    return layout(`
      <section class="page home-page">
        <div class="map-summary">
          <span class="summary-overall"><small>数学一轮</small><strong>${stats.percent}%</strong></span>
          <span><i class="dot level-1"></i><b>${stats.sorted}</b><small>梳理</small></span>
          <span><i class="dot level-2"></i><b>${stats.practiced}</b><small>刷题</small></span>
          <span><i class="dot level-3"></i><b>${stats.reviewed}</b><small>复盘</small></span>
          <span class="summary-total"><b>${stats.total}</b><small>模块</small></span>
        </div>
        <div class="radial-map math-overview-map" aria-label="数学一轮复习知识导图">
          <svg class="home-canvas-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            ${chapterPositions.map(function (position) {
              const controlX = position[0] < 50 ? 37 : 63;
              return `<path d="M 50 50 C ${controlX} 50, ${controlX} ${position[1]}, ${position[0]} ${position[1]}"></path>`;
            }).join("")}
          </svg>
          <a class="map-root focus-root" href="#/directory">
            <small>必刷100讲</small><strong>数学</strong><b>${stats.percent}%</b>
            <span>12 章 · ${stats.total} 模块</span>
          </a>
          ${chapters}
        </div>
        <div class="map-legend"><span><i class="status-bg-0"></i>未开始</span><span><i class="status-bg-1"></i>梳理</span><span><i class="status-bg-2"></i>刷题</span><span><i class="status-bg-3"></i>复盘</span></div>
      </section>
    `, "progress");
  }

  function renderDirectory() {
    const query = getQuery();
    const chapter = findChapter(query.chapter) || subject.chapters[0];
    return renderChapterCanvas(chapter);
  }

  function renderChapterCanvas(chapter) {
    const chapterStats = getStats(chapter.knowledgePoints);
    const modules = chapter.knowledgePoints;
    const positions = canvasPositions(modules.length);
    const moduleNodes = modules.map(function (module, index) {
      const level = getLevel(module.id);
      const position = positions[index];
      return `
        <button class="focus-node module-focus status-surface-${level}" style="--x:${position[0]}%;--y:${position[1]}%" type="button" data-point="${escapeHtml(module.id)}">
          <small>模块 ${String(index + 1).padStart(2, "0")}</small><strong>${escapeHtml(module.name)}</strong><span>${levels[level].label}</span>
        </button>
      `;
    }).join("");

    return layout(`
      <section class="page focus-page">
        <header class="focus-head">
          <a href="#/">数学</a><span>›</span><strong>${escapeHtml(cleanChapterName(chapter.name))}</strong>
          <em>点击模块选择状态</em>
        </header>
        <div class="focus-canvas ${modules.length === 5 ? "five-node-canvas" : modules.length >= 6 ? "dense-canvas" : ""}">
          ${canvasLines(positions)}
          <div class="focus-root">
            <small>CH.${String(chapter.order).padStart(2, "0")}</small><strong>${escapeHtml(cleanChapterName(chapter.name))}</strong><b>${chapterStats.percent}%</b><span>${modules.length} 个模块</span>
          </div>
          ${moduleNodes}
        </div>
        <div class="focus-footer">
          ${chapter.order > 1 ? `<a href="#/directory?chapter=${encodeURIComponent(subject.chapters[chapter.order - 2].id)}">← 上一章</a>` : "<span></span>"}
          <span>${chapter.order} / ${subject.chapters.length}</span>
          ${chapter.order < subject.chapters.length ? `<a href="#/directory?chapter=${encodeURIComponent(subject.chapters[chapter.order].id)}">下一章 →</a>` : "<span></span>"}
        </div>
      </section>
    `, "focus");
  }

  function renderLevelSheet(pointId) {
    const result = findPoint(pointId);
    if (!result) return "";
    const current = getLevel(pointId);
    const buttons = levels.map(function (level) {
      return `<button class="level-option status-${level.value} ${current === level.value ? "selected" : ""}" type="button" data-level="${level.value}"><i>${level.value}</i><span><strong>${level.label}</strong><small>${level.value === 0 ? "清除当前进度" : level.value === 1 ? "知识内容已经系统梳理" : level.value === 2 ? "已完成针对性题目练习" : "错题与方法已经复盘"}</small></span>${current === level.value ? "<b>当前</b>" : ""}</button>`;
    }).join("");
    return `
      <div class="sheet-backdrop" data-action="close-sheet"></div>
      <section class="level-sheet" role="dialog" aria-modal="true" aria-label="选择复习状态">
        <div class="sheet-handle"></div>
        <div class="sheet-head"><div><small>${escapeHtml(cleanChapterName(result.chapter.name))} / 复习模块</small><h2>${escapeHtml(result.point.name)}</h2></div><button type="button" data-action="close-sheet" aria-label="关闭">×</button></div>
        <a class="sheet-plan-link" href="plans.html?subject=math&target=${encodeURIComponent(result.point.id)}">为此模块制定计划 <span>设置完成日期 →</span></a>
        <label class="log-note"><span>本次备注（可选）</span><textarea id="review-note" maxlength="120"></textarea></label>
        <div class="level-options">${buttons}</div>
      </section>
    `;
  }

  function dateKey(iso) {
    const date = new Date(iso);
    return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
  }

  function displayDate(key) {
    const today = dateKey(new Date().toISOString());
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (key === today) return "今天";
    if (key === dateKey(yesterday.toISOString())) return "昨天";
    const parts = key.split("-");
    return Number(parts[1]) + "月" + Number(parts[2]) + "日";
  }

  function displayClock(iso) {
    const date = new Date(iso);
    return String(date.getHours()).padStart(2, "0") + ":" + String(date.getMinutes()).padStart(2, "0");
  }

  function renderLogs() {
    const groups = {};
    logs.slice().sort(function (a, b) { return b.createdAt.localeCompare(a.createdAt); }).forEach(function (log) {
      const key = dateKey(log.createdAt);
      if (!groups[key]) groups[key] = [];
      groups[key].push(log);
    });
    const content = Object.keys(groups).sort().reverse().map(function (key) {
      const entries = groups[key].map(function (log) {
        return `
          <article class="log-item">
            <time>${displayClock(log.createdAt)}</time><span class="log-marker status-bg-${log.toLevel}"></span>
            <div class="log-main">
              <span class="log-path">${escapeHtml(log.chapterName)}</span><strong>${escapeHtml(log.moduleName)}</strong>
              <p>${log.fromLevel === log.toLevel ? "再次记录" : levels[log.fromLevel].label + " → "}<b class="status-pill status-${log.toLevel}">${levels[log.toLevel].label}</b></p>
              ${log.note ? `<blockquote>${escapeHtml(log.note)}</blockquote>` : ""}
            </div>
          </article>`;
      }).join("");
      return `<section class="log-day"><header><h2>${displayDate(key)}</h2><span>${key} · ${groups[key].length} 条</span></header><div class="log-timeline">${entries}</div></section>`;
    }).join("");
    return layout(`
      <section class="page logs-page">
        <div class="logs-head"><div><p class="eyebrow">Review Journal</p><h1>复习日志</h1></div><strong>${logs.length}<small> 条记录</small></strong></div>
        ${content || '<div class="logs-empty"><strong>还没有复习日志</strong><span>设置模块状态后，日期、时间和状态变化会自动记录。</span><a href="#/">返回数学导图</a></div>'}
      </section>`, "logs");
  }

  function findChapter(chapterId) {
    return subject.chapters.find(function (chapter) { return chapter.id === chapterId; });
  }

  function findPoint(pointId) {
    for (const chapter of subject.chapters) {
      const point = chapter.knowledgePoints.find(function (item) { return item.id === pointId; });
      if (point) return { chapter: chapter, point: point };
    }
    return null;
  }

  function getQuery() {
    const hash = window.location.hash;
    const queryIndex = hash.indexOf("?");
    const params = new URLSearchParams(queryIndex >= 0 ? hash.slice(queryIndex + 1) : "");
    return { chapter: params.get("chapter"), point: params.get("point") };
  }

  function route() {
    return window.location.hash.replace(/^#\/?/, "").split("?")[0];
  }

  function render() {
    const currentRoute = route();
    app.innerHTML = currentRoute === "directory" ? renderDirectory() : currentRoute === "logs" ? renderLogs() : renderHome();
    document.title = currentRoute === "directory" ? "复习目录 | 一轮进度" : currentRoute === "logs" ? "复习日志 | 一轮进度" : "复习进度 | 一轮进度";
    window.scrollTo(0, 0);
  }

  function renderRouteTransition() {
    activePointId = null;
    if (document.startViewTransition) {
      document.startViewTransition(render);
      return;
    }
    render();
    app.animate([
      { opacity: 0, transform: "scale(0.992)" },
      { opacity: 1, transform: "scale(1)" }
    ], { duration: 180, easing: "cubic-bezier(.2,.7,.2,1)" });
  }

  app.addEventListener("click", function (event) {
    const target = event.target.closest("button, [data-action]");
    if (!target) return;
    if (target.dataset.chapter) {
      viewState.chapters[target.dataset.chapter] = !viewState.chapters[target.dataset.chapter];
      saveJson(VIEW_KEY, viewState);
      render();
    } else if (target.dataset.module) {
      viewState.modules[target.dataset.module] = !viewState.modules[target.dataset.module];
      saveJson(VIEW_KEY, viewState);
      render();
    } else if (target.dataset.point) {
      activePointId = target.dataset.point;
      render();
    } else if (target.dataset.level !== undefined && activePointId) {
      const level = Number(target.dataset.level);
      const previousLevel = getLevel(activePointId);
      const result = findPoint(activePointId);
      const noteField = document.getElementById("review-note");
      const note = noteField ? noteField.value.trim() : "";
      if (result) {
        logs.push({
          id: "log-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
          pointId: activePointId,
          chapterId: result.chapter.id,
          chapterName: cleanChapterName(result.chapter.name),
          moduleName: result.point.name,
          fromLevel: previousLevel,
          toLevel: level,
          note: note,
          createdAt: new Date().toISOString()
        });
        saveJson(LOGS_KEY, logs);
      }
      if (level === 0) {
        delete records[activePointId];
      } else {
        records[activePointId] = { level: level, updatedAt: new Date().toISOString() };
      }
      saveJson(RECORDS_KEY, records);
      activePointId = null;
      render();
    } else if (target.dataset.action === "close-sheet") {
      activePointId = null;
      render();
    } else if (target.dataset.action === "toggle-all") {
      const shouldOpen = subject.chapters.some(function (chapter) { return !viewState.chapters[chapter.id]; });
      subject.chapters.forEach(function (chapter) {
        viewState.chapters[chapter.id] = shouldOpen;
        getModules(chapter).forEach(function (module) { viewState.modules[module.id] = shouldOpen; });
      });
      saveJson(VIEW_KEY, viewState);
      render();
    }
  });

  window.addEventListener("hashchange", function () {
    renderRouteTransition();
  });
  render();
})();
