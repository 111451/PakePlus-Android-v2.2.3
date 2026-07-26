(function () {
  "use strict";

  const app = document.getElementById("app");
  const subject = window.BIOLOGY_TREE;
  const RECORDS_KEY = "review-tracker-biology-records-v1";
  const levels = [
    { value: 0, label: "未开始", detail: "清除当前进度" },
    { value: 1, label: "已梳理", detail: "本章知识内容已经系统梳理" },
    { value: 2, label: "已刷题", detail: "已完成本章针对性题目练习" },
    { value: 3, label: "已复盘", detail: "本章错题与方法已经复盘" }
  ];

  let records = readRecords();
  let activeChapterId = null;

  function readRecords() {
    try {
      return JSON.parse(localStorage.getItem(RECORDS_KEY) || "{}");
    } catch (error) {
      return {};
    }
  }

  function saveRecords() {
    try {
      localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
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

  function allChapters(textbook) {
    return textbook
      ? textbook.chapters
      : subject.textbooks.reduce(function (chapters, item) {
          return chapters.concat(item.chapters);
        }, []);
  }

  function getLevel(chapterId) {
    const record = records[chapterId];
    return record && Number.isInteger(record.level) ? record.level : 0;
  }

  function getStats(chapters) {
    const exact = [0, 0, 0, 0];
    let score = 0;
    chapters.forEach(function (chapter) {
      const level = getLevel(chapter.id);
      exact[level] += 1;
      score += level;
    });
    return {
      total: chapters.length,
      exact: exact,
      sorted: exact[1] + exact[2] + exact[3],
      practiced: exact[2] + exact[3],
      reviewed: exact[3],
      percent: chapters.length ? Math.round(score / (chapters.length * 3) * 100) : 0
    };
  }

  function layout(content, focused) {
    return `
      <div class="app-shell ${focused ? "focus-shell" : ""}">
        <header class="topbar">
          <a class="brand" href="biology.html">${focused ? "← 返回生物" : "一轮进度"}</a>
          <a class="subject-chip" href="subjects.html">切换科目</a>
        </header>
        <main>${content}</main>
      </div>
      ${activeChapterId ? renderLevelSheet(activeChapterId) : ""}
    `;
  }

  function renderHome() {
    const stats = getStats(allChapters());
    const cards = subject.textbooks.map(function (textbook) {
      const textbookStats = getStats(textbook.chapters);
      const dots = textbook.chapters.map(function (chapter) {
        return `<i class="matrix-dot status-bg-${getLevel(chapter.id)}" title="${escapeHtml(chapter.name)}"></i>`;
      }).join("");
      return `
        <a class="biology-book shade-${Math.ceil(textbookStats.percent / 34)}" href="#/textbook?id=${encodeURIComponent(textbook.id)}">
          <span class="biology-book-meta"><b>${escapeHtml(textbook.label)}</b><em>${textbookStats.percent}%</em></span>
          <strong>${escapeHtml(textbook.name)}</strong>
          <span class="dot-matrix">${dots}</span>
          <small>${textbook.chapters.length} 章</small>
        </a>
      `;
    }).join("");

    return layout(`
      <section class="page biology-home">
        <div class="map-summary">
          <span class="summary-overall"><small>生物一轮</small><strong>${stats.percent}%</strong></span>
          <span><i class="dot level-1"></i><b>${stats.sorted}</b><small>梳理</small></span>
          <span><i class="dot level-2"></i><b>${stats.practiced}</b><small>刷题</small></span>
          <span><i class="dot level-3"></i><b>${stats.reviewed}</b><small>复盘</small></span>
          <span class="summary-total"><b>${stats.total}</b><small>章节</small></span>
        </div>
        <header class="biology-intro">
          <p class="eyebrow">PEP BIOLOGY · ROUND ONE</p>
          <h1>按教材推进，按章节记录</h1>
          <p>不拆考点，每章只维护一份复习状态。</p>
        </header>
        <div class="biology-books">${cards}</div>
        <div class="map-legend"><span><i class="status-bg-0"></i>未开始</span><span><i class="status-bg-1"></i>梳理</span><span><i class="status-bg-2"></i>刷题</span><span><i class="status-bg-3"></i>复盘</span></div>
      </section>
    `, false);
  }

  function renderTextbook() {
    const textbook = findTextbook(getQueryId()) || subject.textbooks[0];
    const stats = getStats(textbook.chapters);
    const chapters = textbook.chapters.map(function (chapter) {
      const level = getLevel(chapter.id);
      return `
        <button class="biology-chapter status-surface-${level}" type="button" data-chapter="${escapeHtml(chapter.id)}">
          <span class="biology-chapter-number">${String(chapter.number).padStart(2, "0")}</span>
          <span><small>第 ${chapter.number} 章</small><strong>${escapeHtml(chapter.name)}</strong></span>
          <b class="status-pill status-${level}">${levels[level].label}</b>
        </button>
      `;
    }).join("");

    return layout(`
      <section class="page biology-textbook">
        <header class="biology-textbook-head">
          <span><small>${escapeHtml(textbook.label)}</small><h1>${escapeHtml(textbook.name)}</h1></span>
          <strong>${stats.percent}%</strong>
        </header>
        <div class="biology-textbook-progress">
          <span>${textbook.chapters.length} 章</span>
          <span>${stats.reviewed} 章已复盘</span>
        </div>
        <div class="biology-chapters">${chapters}</div>
        <nav class="biology-book-nav" aria-label="切换教材">
          ${subject.textbooks.map(function (item) {
            return `<a class="${item.id === textbook.id ? "active" : ""}" href="#/textbook?id=${encodeURIComponent(item.id)}">${escapeHtml(item.label)}</a>`;
          }).join("")}
        </nav>
      </section>
    `, true);
  }

  function renderLevelSheet(chapterId) {
    const result = findChapter(chapterId);
    if (!result) return "";
    const current = getLevel(chapterId);
    return `
      <div class="sheet-backdrop" data-action="close-sheet"></div>
      <section class="level-sheet" role="dialog" aria-modal="true" aria-label="选择复习状态">
        <div class="sheet-handle"></div>
        <div class="sheet-head"><div><small>${escapeHtml(result.textbook.label)}《${escapeHtml(result.textbook.name)}》/ 第 ${result.chapter.number} 章</small><h2>${escapeHtml(result.chapter.name)}</h2></div><button type="button" data-action="close-sheet" aria-label="关闭">×</button></div>
        <div class="level-options">
          ${levels.map(function (level) {
            return `<button class="level-option status-${level.value} ${current === level.value ? "selected" : ""}" type="button" data-level="${level.value}"><i>${level.value}</i><span><strong>${level.label}</strong><small>${level.detail}</small></span>${current === level.value ? "<b>当前</b>" : ""}</button>`;
          }).join("")}
        </div>
      </section>
    `;
  }

  function findTextbook(id) {
    return subject.textbooks.find(function (textbook) { return textbook.id === id; });
  }

  function findChapter(id) {
    for (const textbook of subject.textbooks) {
      const chapter = textbook.chapters.find(function (item) { return item.id === id; });
      if (chapter) return { textbook: textbook, chapter: chapter };
    }
    return null;
  }

  function getQueryId() {
    const queryIndex = window.location.hash.indexOf("?");
    const params = new URLSearchParams(queryIndex >= 0 ? window.location.hash.slice(queryIndex + 1) : "");
    return params.get("id");
  }

  function isTextbookRoute() {
    return window.location.hash.replace(/^#\/?/, "").split("?")[0] === "textbook";
  }

  function render() {
    app.innerHTML = isTextbookRoute() ? renderTextbook() : renderHome();
    document.title = isTextbookRoute() ? "生物教材 | 一轮进度" : "生物一轮 | 一轮进度";
    window.scrollTo(0, 0);
  }

  app.addEventListener("click", function (event) {
    const target = event.target.closest("button, [data-action]");
    if (!target) return;
    if (target.dataset.chapter) {
      activeChapterId = target.dataset.chapter;
      render();
    } else if (target.dataset.level !== undefined && activeChapterId) {
      const level = Number(target.dataset.level);
      if (level === 0) {
        delete records[activeChapterId];
      } else {
        records[activeChapterId] = { level: level, updatedAt: new Date().toISOString() };
      }
      saveRecords();
      activeChapterId = null;
      render();
    } else if (target.dataset.action === "close-sheet") {
      activeChapterId = null;
      render();
    }
  });

  window.addEventListener("hashchange", function () {
    activeChapterId = null;
    render();
  });
  render();
})();
