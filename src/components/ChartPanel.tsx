import { useEffect, useRef } from "react";
import * as echarts from "echarts";
import type { EChartsOption } from "echarts";
import type { ChartSpec } from "../types/agent";

const PALETTE = ["#6366f1", "#8b5cf6", "#22d3ee", "#10b981", "#f59e0b", "#ef4444"];
const LABEL = "#4b5563";
const AXIS = "#e5e7eb";

function buildOption(chart: ChartSpec): EChartsOption {
  if (chart.type === "pie") {
    return {
      tooltip: { trigger: "item", formatter: "{b}: {c}%" },
      legend: { bottom: 0, textStyle: { color: LABEL }, icon: "circle" },
      series: [
        {
          type: "pie",
          radius: ["42%", "70%"],
          center: ["50%", "44%"],
          itemStyle: { borderRadius: 8, borderColor: "#fff", borderWidth: 2 },
          label: { color: LABEL },
          data: (chart.pieData ?? []).map((d) => ({ name: d.name, value: d.value })),
          color: PALETTE,
        },
      ],
    };
  }

  const cats = chart.categories ?? [];
  const series: any[] = (chart.series ?? []).map((s) => ({
    name: s.name,
    type: chart.type,
    data: s.data,
    smooth: chart.type === "line",
    symbol: chart.type === "line" ? "circle" : "none",
    symbolSize: 7,
    barWidth: chart.type === "bar" ? "48%" : undefined,
    lineStyle: { width: 3, color: s.color ?? PALETTE[0] },
    itemStyle: {
      color: s.color ?? PALETTE[0],
      borderRadius: chart.type === "bar" ? ([6, 6, 0, 0] as [number, number, number, number]) : 0,
    },
    areaStyle:
      chart.type === "line"
        ? {
            opacity: 0.18,
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: (s.color ?? PALETTE[0]) + "88" },
              { offset: 1, color: (s.color ?? PALETTE[0]) + "00" },
            ]),
          }
        : undefined,
  }));

  const rotate = cats.length > 6 ? 32 : 0;

  return {
    tooltip: { trigger: "axis" },
    legend: { top: 0, textStyle: { color: LABEL }, icon: "roundRect" },
    grid: { left: 8, right: 16, top: 40, bottom: 8, containLabel: true },
    xAxis: {
      type: "category",
      data: cats,
      axisLine: { lineStyle: { color: AXIS } },
      axisLabel: { color: LABEL, interval: 0, rotate },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: LABEL },
      splitLine: { lineStyle: { color: "#f3f4f6" } },
    },
    series,
    color: PALETTE,
  };
}

export default function ChartPanel({ chart }: { chart: ChartSpec }) {
  const ref = useRef<HTMLDivElement>(null);
  const inst = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    inst.current = echarts.init(ref.current);
    const ro = new ResizeObserver(() => inst.current?.resize());
    ro.observe(ref.current);
    return () => {
      ro.disconnect();
      inst.current?.dispose();
      inst.current = null;
    };
  }, []);

  useEffect(() => {
    inst.current?.setOption(buildOption(chart), true);
    inst.current?.resize();
  }, [chart]);

  return <div ref={ref} className="h-[300px] w-full" />;
}
