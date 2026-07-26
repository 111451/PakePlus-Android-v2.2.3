(function () {
  "use strict";

  const definitions = [
    ["第1章 集合与常用逻辑用语", ["集合", "常用逻辑用语"]],
    ["第2章 一元二次函数、方程与不等式", ["不等式与二次函数", "基本不等式"]],
    ["第3章 函数与导数", ["函数的概念与性质", "函数三类基础题型", "导数常规题型", "分段函数问题", "零点与不等式", "复合函数综合", "函数构造思想", "导数综合大题"]],
    ["第4章 三角函数", ["同角三角函数关系与诱导公式", "三角恒等变换", "三角函数的图象性质", "三角函数提高篇"]],
    ["第5章 解三角形", ["相关定理的基本应用", "代数问题篇", "几何问题篇"]],
    ["第6章 平面向量", ["平面向量"]],
    ["第7章 复数", ["复数"]],
    ["第8章 数列", ["等差、等比数列问题", "求通项与求和", "数列拔高题型"]],
    ["第9章 立体几何、空间向量", ["立体图形的结构探究", "位置关系的判定", "空间向量及其应用", "综合提升篇"]],
    ["第10章 解析几何", ["直线与方程", "圆与方程", "椭圆与方程", "双曲线与方程", "抛物线与方程", "解析几何大题"]],
    ["第11章 计数原理", ["排列与组合", "二项式定理"]],
    ["第12章 概率统计", ["统计", "随机事件的概率、事件的独立性", "离散型随机变量及其分布", "成对数据的统计分析"]]
  ];

  const chapters = definitions.map(function (definition, chapterIndex) {
    const chapterId = "math-ch" + String(chapterIndex + 1).padStart(2, "0");
    return {
      id: chapterId,
      subjectId: "math",
      name: definition[0],
      order: chapterIndex + 1,
      knowledgePoints: definition[1].map(function (name, moduleIndex) {
        return {
          id: chapterId + "-module-" + String(moduleIndex + 1).padStart(2, "0"),
          subjectId: "math",
          chapterId: chapterId,
          name: name,
          module: name,
          order: moduleIndex + 1
        };
      })
    };
  });

  window.KNOWLEDGE_TREE = {
    subjects: [{
      id: "math",
      name: "数学",
      source: "必刷100讲",
      description: "数学一轮复习章节与模块目录。",
      chapters: chapters
    }]
  };
})();
