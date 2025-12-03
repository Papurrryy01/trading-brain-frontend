// frontend/src/components/ProjectionMiniChart.jsx
import React, { useEffect, useRef } from "react";
import { createChart } from "lightweight-charts";

const ProjectionMiniChart = ({ cone }) => {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const centerSeriesRef = useRef(null);
  const upperSeriesRef = useRef(null);
  const lowerSeriesRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      layout: {
        background: { color: "#020617" },
        textColor: "#9ca3af",
      },
      grid: {
        vertLines: { color: "#111827" },
        horzLines: { color: "#111827" },
      },
      rightPriceScale: {
        borderColor: "#1f2933",
        priceFormat: {
          type: "price",
          precision: 5,
          minMove: 0.00001,
        },
      },
      timeScale: {
        borderColor: "#1f2933",
        rightOffset: 0,
      },
      crosshair: {
        mode: 0,
      },
    });

    chartRef.current = chart;

    // series central + bandas
    const centerSeries = chart.addLineSeries({
      lineWidth: 2,
      color: "#22c55e",
    });
    const upperSeries = chart.addLineSeries({
      lineWidth: 1,
      color: "#22c55e",
      lineStyle: 2, // dashed
    });
    const lowerSeries = chart.addLineSeries({
      lineWidth: 1,
      color: "#ef4444",
      lineStyle: 2,
    });

    centerSeriesRef.current = centerSeries;
    upperSeriesRef.current = upperSeries;
    lowerSeriesRef.current = lowerSeries;

    const handleResize = () => {
      if (!chartRef.current || !containerRef.current) return;
      chartRef.current.applyOptions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });
      chartRef.current.timeScale().fitContent();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, []);

  // cuando cambie el cone, pintamos los datos
  useEffect(() => {
    if (!cone || !chartRef.current) return;

    const { central_path, upper_path, lower_path } = cone;

    if (!central_path || central_path.length === 0) return;

    const len = central_path.length;

    const baseTime = Math.floor(Date.now() / 1000);

    const toSeriesData = (arr) =>
      arr.map((price, i) => ({
        time: baseTime + i * 60, // 1 punto = 1 "vela" futura de 1M (solo para eje)
        value: price,
      }));

    const centerData = toSeriesData(central_path);
    const upperData = upper_path ? toSeriesData(upper_path) : [];
    const lowerData = lower_path ? toSeriesData(lower_path) : [];

    centerSeriesRef.current.setData(centerData);
    if (upperData.length) upperSeriesRef.current.setData(upperData);
    if (lowerData.length) lowerSeriesRef.current.setData(lowerData);

    chartRef.current.timeScale().fitContent();
  }, [cone]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
      }}
    />
  );
};

export default ProjectionMiniChart;
