import type { Scenario, ToolDef } from "../types/agent";

export const SCHEMA_TABLES = [
  "users（用户表：user_id, name, city, register_time）",
  "products（商品表：product_id, name, category, price）",
  "orders（订单表：order_id, user_id, product_id, amount, create_time）",
  "reviews（评价表：review_id, user_id, product_id, score, content）",
];

export const TOOLS: ToolDef[] = [
  { id: "schema_tool", name: "schema_tool", desc: "获取数据库结构，理解可用数据表与字段" },
  { id: "sql_query_tool", name: "sql_query_tool", desc: "根据自然语言需求生成并执行 SQL 查询" },
  { id: "analysis_tool", name: "analysis_tool", desc: "对查询结果做统计、归因与趋势分析" },
  { id: "chart_tool", name: "chart_tool", desc: "自动选择图表类型并生成可视化 ECharts 配置" },
];

export const SCENARIOS: Scenario[] = [
  {
    key: "trend",
    label: "分析2025年每个月销售额趋势，并生成折线图",
    match: ["趋势", "每月", "月份", "折线", "销售额趋势", "销售趋势"],
    intent: "分析 2025 年各月销售额走势，识别增长与波动节点，并生成折线图。",
    sql: `SELECT
  DATE_FORMAT(create_time, '%Y-%m') AS month,
  SUM(amount) AS sales
FROM orders
WHERE YEAR(create_time) = 2025
GROUP BY month
ORDER BY month;`,
    table: {
      columns: ["月份", "销售额(元)"],
      rows: [
        ["2025-01", 120000],
        ["2025-02", 138000],
        ["2025-03", 162400],
        ["2025-04", 150200],
        ["2025-05", 175800],
        ["2025-06", 198600],
        ["2025-07", 210300],
        ["2025-08", 205100],
        ["2025-09", 232700],
        ["2025-10", 248900],
        ["2025-11", 271500],
        ["2025-12", 305200],
      ],
    },
    chart: {
      type: "line",
      title: "2025 年销售额趋势",
      categories: [
        "1月", "2月", "3月", "4月", "5月", "6月",
        "7月", "8月", "9月", "10月", "11月", "12月",
      ],
      series: [{ name: "销售额", data: [12, 13.8, 16.24, 15.02, 17.58, 19.86, 21.03, 20.51, 23.27, 24.89, 27.15, 30.52] }],
    },
    report: {
      summary:
        "2025 年整体销售额呈稳健上升趋势，全年累计约 233.6 万元，同比增长约 18%。",
      bullets: [
        "全年 12 个月销售额持续走高，仅 4 月、8 月出现小幅回落。",
        "3 月环比增长明显（+17.7%），与春季促销节奏吻合。",
        "下半年增速加快，Q4 单季贡献全年约 35% 的销售额。",
      ],
      suggestions: [
        "将春季促销经验复用至年中大促，巩固增长曲线。",
        "针对 4 月、8 月回落，提前布局补货与精准投放。",
        "加大 Q4 资源投入，把握年末消费高峰。",
      ],
    },
    reactLog: [
      { type: "Thought", content: "用户需要 2025 年各月销售趋势，应先按月份聚合订单金额。" },
      { type: "Action", content: "call schema_tool" },
      { type: "Observation", content: "schema loaded: users, products, orders, reviews" },
      { type: "Action", content: "call sql_query_tool" },
      { type: "Observation", content: "SQL generated: SELECT month, SUM(amount) ... GROUP BY month" },
      { type: "Action", content: "call analysis_tool" },
      { type: "Observation", content: "trend detected: +18% YoY, two minor dips in Apr/Aug" },
      { type: "Action", content: "call chart_tool" },
      { type: "Observation", content: "line chart generated successfully" },
    ],
  },
  {
    key: "region",
    label: "找出销售额下降最多的地区，并分析原因",
    match: ["地区", "下降", "下滑", "区域", "原因"],
    intent: "对比各地区销售额同比变化，定位下滑最严重的地区并做归因分析。",
    sql: `SELECT
  u.city AS region,
  SUM(o.amount) AS sales_2025,
  ROUND(
    (SUM(o.amount) - lag_sum) / lag_sum * 100, 1
  ) AS yoy
FROM orders o
JOIN users u ON o.user_id = u.user_id
GROUP BY u.city
ORDER BY yoy ASC;`,
    table: {
      columns: ["地区", "2025销售额(元)", "同比变化"],
      rows: [
        ["华东", 986000, "+22.4%"],
        ["华南", 742000, "+12.1%"],
        ["西南", 521000, "+8.6%"],
        ["华中", 463000, "+3.2%"],
        ["东北", 298000, "-6.7%"],
        ["华北", 412000, "-14.3%"],
      ],
    },
    chart: {
      type: "bar",
      title: "各地区销售额与同比变化",
      categories: ["华东", "华南", "西南", "华中", "东北", "华北"],
      series: [{ name: "销售额(万元)", data: [98.6, 74.2, 52.1, 46.3, 29.8, 41.2], color: "#22D3EE" }],
    },
    report: {
      summary:
        "华北地区销售额同比下滑 14.3%，为下降最多的地区；东北小幅下滑 6.7%。",
      bullets: [
        "华北地区 2025 年销售额为 41.2 万元，同比下降 14.3%，降幅居首。",
        "归因于主要代理商流失与 Q2 物流中断导致缺货超 20 天。",
        "东北受人口流出影响，需求侧持续走弱。",
      ],
      suggestions: [
        "华北：重建区域代理渠道，针对 Q2 物流做冗余仓配方案。",
        "华北：上线本地化优惠唤回流失客户。",
        "东北：聚焦高客单价品类，控制获客成本。",
      ],
    },
    reactLog: [
      { type: "Thought", content: "需按地区聚合并对比同比，找出降幅最大的区域，再做归因。" },
      { type: "Action", content: "call schema_tool" },
      { type: "Observation", content: "schema loaded: users.city, orders.amount" },
      { type: "Action", content: "call sql_query_tool" },
      { type: "Observation", content: "SQL generated: GROUP BY city with YoY" },
      { type: "Action", content: "call analysis_tool" },
      { type: "Observation", content: "华北 -14.3% is the largest decline; root cause: agent churn + logistics" },
      { type: "Action", content: "call chart_tool" },
      { type: "Observation", content: "bar chart generated successfully" },
    ],
  },
  {
    key: "top",
    label: "统计销量最高的10个商品",
    match: ["销量", "商品", "top", "排行", "top10", "10个"],
    intent: "按销量统计排名前 10 的商品，输出排行并可视化。",
    sql: `SELECT
  p.name AS product,
  SUM(o.qty) AS total_qty
FROM orders o
JOIN products p ON o.product_id = p.product_id
GROUP BY p.name
ORDER BY total_qty DESC
LIMIT 10;`,
    table: {
      columns: ["商品", "销量(件)"],
      rows: [
        ["智能降噪耳机", 8420],
        ["便携咖啡机", 7310],
        ["人体工学椅", 6880],
        ["无线机械键盘", 6120],
        ["空气炸锅", 5740],
        ["4K 投影仪", 5230],
        ["运动手表", 4980],
        ["桌面香薰机", 4150],
        ["迷你加湿器", 3870],
        ["智能台灯", 3560],
      ],
    },
    chart: {
      type: "bar",
      title: "销量 Top 10 商品",
      categories: [
        "智能降噪耳机", "便携咖啡机", "人体工学椅", "无线机械键盘",
        "空气炸锅", "4K投影仪", "运动手表", "桌面香薰机", "迷你加湿器", "智能台灯",
      ],
      series: [{ name: "销量(件)", data: [8420, 7310, 6880, 6120, 5740, 5230, 4980, 4150, 3870, 3560], color: "#8B5CF6" }],
    },
    report: {
      summary: "销量最高的商品为「智能降噪耳机」，全年售出 8420 件，数码音频类占据榜单半壁。",
      bullets: [
        "Top 10 商品销量均超 3500 件，头部集中度明显。",
        "数码音频、小家电类目表现强势，共占 6 席。",
        "家居办公类（人体工学椅、香薰机）稳步上榜。",
      ],
      suggestions: [
        "对 Top 3 商品增加库存与首页曝光。",
        "基于榜单拓展同类目 SKU，形成品类矩阵。",
        "为长尾商品设计组合装提升连带率。",
      ],
    },
    reactLog: [
      { type: "Thought", content: "需要商品销量聚合并取前 10，再生成横向排行图。" },
      { type: "Action", content: "call schema_tool" },
      { type: "Observation", content: "schema loaded: products.name, orders.qty" },
      { type: "Action", content: "call sql_query_tool" },
      { type: "Observation", content: "SQL generated: ORDER BY total_qty DESC LIMIT 10" },
      { type: "Action", content: "call analysis_tool" },
      { type: "Observation", content: "top item: 智能降噪耳机 (8420); electronics dominate" },
      { type: "Action", content: "call chart_tool" },
      { type: "Observation", content: "horizontal bar chart generated successfully" },
    ],
  },
  {
    key: "behavior",
    label: "分析用户购买行为",
    match: ["购买行为", "用户行为", "行为", "偏好", "分类占比", "品类"],
    intent: "分析用户购买偏好，按商品分类统计订单结构与占比。",
    sql: `SELECT
  p.category AS category,
  COUNT(*) AS orders,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) AS share
FROM orders o
JOIN products p ON o.product_id = p.product_id
GROUP BY p.category
ORDER BY orders DESC;`,
    table: {
      columns: ["商品分类", "订单数", "占比"],
      rows: [
        ["数码音频", 3860, "28.4%"],
        ["小家电", 3120, "22.9%"],
        ["家居办公", 2410, "17.7%"],
        ["智能穿戴", 1980, "14.6%"],
        ["运动户外", 1220, "9.0%"],
        ["其他", 1010, "7.4%"],
      ],
    },
    chart: {
      type: "pie",
      title: "用户购买品类分布",
      pieData: [
        { name: "数码音频", value: 28.4 },
        { name: "小家电", value: 22.9 },
        { name: "家居办公", value: 17.7 },
        { name: "智能穿戴", value: 14.6 },
        { name: "运动户外", value: 9.0 },
        { name: "其他", value: 7.4 },
      ],
    },
    report: {
      summary: "用户购买偏好高度集中于数码音频与小家电，两类目合计贡献超 50% 订单。",
      bullets: [
        "数码音频占比 28.4% 居首，小家电 22.9% 次之。",
        "复购用户更偏好智能穿戴类，客单价更高。",
        "运动户外与其他类目存在明显交叉购买机会。",
      ],
      suggestions: [
        "围绕数码音频做会员专属权益，提升复购。",
        "小家电与家居办公组合推荐，提高客单价。",
        "对长尾类目做内容种草，培育新增长极。",
      ],
    },
    reactLog: [
      { type: "Thought", content: "分析购买行为需按分类聚合订单，并计算占比分布。" },
      { type: "Action", content: "call schema_tool" },
      { type: "Observation", content: "schema loaded: products.category, orders" },
      { type: "Action", content: "call sql_query_tool" },
      { type: "Observation", content: "SQL generated: GROUP BY category with share %" },
      { type: "Action", content: "call analysis_tool" },
      { type: "Observation", content: "top category: 数码音频 28.4%; electronics lead" },
      { type: "Action", content: "call chart_tool" },
      { type: "Observation", content: "pie chart generated successfully" },
    ],
  },
];

export const FALLBACK = SCENARIOS[0];

export function matchScenario(input: string): Scenario {
  const text = input.toLowerCase();
  for (const s of SCENARIOS) {
    if (s.match.some((k) => text.includes(k.toLowerCase()))) return s;
  }
  return FALLBACK;
}
