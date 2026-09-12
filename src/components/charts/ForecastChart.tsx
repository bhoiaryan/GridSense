import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { LegendProps } from "recharts";
import type { ForecastPoint } from "../../types";

interface ForecastTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: ForecastPoint;
  }>;
}

interface ForecastChartProps {
  data: ForecastPoint[];
  compact?: boolean;
  selectedHour?: string;
  onSelectPoint?: (point: ForecastPoint) => void;
  showUncertainty?: boolean;
  showDemand?: boolean;
  showIrradiance?: boolean;
  showRiskAreas?: boolean;
}

export function ForecastChart({
  data,
  compact = false,
  selectedHour,
  onSelectPoint,
  showUncertainty = true,
  showDemand = true,
  showIrradiance = false,
  showRiskAreas = true
}: ForecastChartProps) {
  const chartData = data.map((point) => ({
    ...point,
    uncertaintyBase: point.lower,
    uncertaintyRange: Math.max(0, point.upper - point.lower),
    irradianceScaled: Number((point.irradiance / 10).toFixed(1)) // 0-100 scale for visual overlay
  }));

  const hasD2Points = data.some((p) => p.hour.startsWith("D2"));
  const hasD3Points = data.some((p) => p.hour.startsWith("D3"));

  return (
    <div className={compact ? "h-[280px]" : "h-[420px]"}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={{ top: 12, right: showIrradiance ? 42 : 18, bottom: 8, left: -4 }}
          onClick={(state) => {
            if (state && state.activePayload && state.activePayload[0] && onSelectPoint) {
              const clickedPoint = state.activePayload[0].payload as ForecastPoint;
              onSelectPoint(clickedPoint);
            }
          }}
        >
          <CartesianGrid stroke="#dbe7e1" strokeDasharray="4 6" vertical={false} />
          <XAxis
            dataKey="hour"
            interval={compact ? 3 : data.length > 30 ? 2 : 1}
            tick={{ fontSize: 11, fill: "#4e6b5d", fontWeight: 500 }}
            tickLine={false}
            axisLine={{ stroke: "#c2d6cc" }}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11, fill: "#4e6b5d", fontWeight: 500 }}
            tickLine={false}
            axisLine={false}
            unit=" MW"
            width={54}
            domain={[0, (dataMax: number) => Math.max(120, Math.ceil(dataMax / 10) * 10)]}
          />
          {showIrradiance && (
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 10, fill: "#b45309", fontWeight: 500 }}
              tickLine={false}
              axisLine={false}
              unit=" W/m²"
              width={60}
              domain={[0, 1000]}
              tickFormatter={(v: number) => `${v}`}
            />
          )}

          <Tooltip content={<CustomForecastTooltip canInspect={Boolean(onSelectPoint)} />} />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8, color: "#4e6b5d", fontWeight: 600 }}
            iconType="circle"
            content={<ForecastLegend />}
          />

          {/* Risk highlight zones */}
          {showRiskAreas && (
            <>
              {/* Day 1 High Risk Shortfall */}
              <ReferenceArea
                yAxisId="left"
                x1="17:00"
                x2="20:00"
                fill="#fee2e2"
                fillOpacity={0.5}
                label={{ value: "Shortfall", fontSize: 10, fill: "#b91c1c", position: "insideTopLeft", fontWeight: 700 }}
              />

              {/* Day 2 High Risk Shortfall */}
              {hasD2Points && (
                <ReferenceArea
                  yAxisId="left"
                  x1="D2 16:00"
                  x2="D2 20:00"
                  fill="#fee2e2"
                  fillOpacity={0.48}
                  label={{ value: "D2 Shortfall", fontSize: 10, fill: "#b91c1c", position: "insideTopLeft", fontWeight: 700 }}
                />
              )}

              {/* Day 3 Midday Surplus */}
              {hasD3Points && (
                <ReferenceArea
                  yAxisId="left"
                  x1="D3 10:00"
                  x2="D3 14:00"
                  fill="#dcfce7"
                  fillOpacity={0.42}
                  label={{ value: "D3 Surplus", fontSize: 10, fill: "#15803d", position: "insideTopLeft", fontWeight: 700 }}
                />
              )}
            </>
          )}

          {/* Uncertainty Range Band (P10 - P90) */}
          {showUncertainty && (
            <>
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="uncertaintyBase"
                stackId="uncertaintyStack"
                stroke="none"
                fill="transparent"
                legendType="none"
                name=""
                isAnimationActive={false}
              />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="uncertaintyRange"
                stackId="uncertaintyStack"
                stroke="none"
                fill="#f59e0b"
                fillOpacity={0.18}
                name="Uncertainty range (P10-P90)"
                isAnimationActive={false}
              />
            </>
          )}

          {/* Irradiance overlay on secondary axis */}
          {showIrradiance && (
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="irradiance"
              stroke="#f59e0b"
              strokeWidth={1.5}
              strokeDasharray="2 2"
              dot={false}
              name="Irradiance (W/m²)"
            />
          )}

          {/* Historical Telemetry Line */}
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="historical"
            stroke="#4e6b5d"
            strokeWidth={2.25}
            dot={false}
            activeDot={{ r: 5, fill: "#0c2419" }}
            name="Historical Measured"
            connectNulls
          />

          {/* Forecast Expected Line */}
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="expected"
            stroke="#047857"
            strokeWidth={2.75}
            dot={false}
            activeDot={{ r: 6, fill: "#047857", stroke: "#ffffff", strokeWidth: 2 }}
            name="Expected Solar Forecast"
          />

          {/* Grid Demand Reference */}
          {showDemand && (
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="demand"
              stroke="#dc2626"
              strokeWidth={2}
              strokeDasharray="6 5"
              dot={false}
              name="Grid Demand Requirement"
            />
          )}

          {/* NOW Indicator */}
          <ReferenceLine
            yAxisId="left"
            x="15:00"
            stroke="#0c2419"
            strokeWidth={1.75}
            strokeDasharray="4 5"
            label={{ value: "NOW", position: "insideTopRight", fontSize: 11, fill: "#0c2419", fontWeight: "bold" }}
          />

          {/* Selected Hour Indicator */}
          {selectedHour && selectedHour !== "15:00" && (
            <ReferenceLine
              yAxisId="left"
              x={selectedHour}
              stroke="#047857"
              strokeWidth={1.5}
              strokeDasharray="2 2"
              label={{ value: "Selected", position: "insideBottom", fontSize: 10, fill: "#047857" }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function ForecastLegend({ payload }: LegendProps) {
  const visibleItems = (payload ?? []).filter((item) => item.value && item.value !== "uncertaintyBase");

  if (!visibleItems.length) return null;

  return (
    <ul className="mt-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-semibold text-slate-600">
      {visibleItems.map((item) => (
        <li key={`${item.dataKey}-${item.value}`} className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
          <span>{item.value}</span>
        </li>
      ))}
    </ul>
  );
}

// Custom rich tooltip for operator inspection
function CustomForecastTooltip({ active, payload, canInspect }: ForecastTooltipProps & { canInspect?: boolean }) {
  if (!active || !payload || !payload.length) return null;

  const data: ForecastPoint = payload[0].payload;
  const spread = (data.upper - data.lower).toFixed(1);
  const netBalance = (data.expected - data.demand).toFixed(1);
  const isShortfall = data.expected < data.demand;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-lg min-w-[260px] text-xs">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
        <div>
          <span className="font-bold text-slate-800 text-sm">{data.fullTimeLabel || data.hour}</span>
          {data.dayLabel && <span className="ml-1.5 text-slate-500 font-normal">({data.dayLabel})</span>}
        </div>
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
            data.risk === "HIGH"
              ? "bg-[#fff1f0] text-[#9b3f42] border border-[#ebd5d2]"
              : data.risk === "MEDIUM"
                ? "bg-[#f9f1e5] text-[#7d6944] border border-[#e5d9c2]"
                : "bg-[#eef8f2] text-[#386c58] border border-[#d6e7dd]"
          }`}
        >
          {data.risk} RISK
        </span>
      </div>

      <div className="space-y-1.5">
        {typeof data.historical === "number" && (
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Historical measured:</span>
            <span className="font-semibold text-slate-700">{data.historical.toFixed(1)} MW</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-slate-600 font-medium">Expected forecast:</span>
          <span className="font-bold text-[#386c58] text-sm">{data.expected.toFixed(1)} MW</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-500">Forecast range (P10-P90):</span>
          <span className="font-semibold text-[#7d6944]">
            {data.lower.toFixed(1)} - {data.upper.toFixed(1)} MW (±{(Number(spread) / 2).toFixed(1)})
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-500">Grid demand requirement:</span>
          <span className="font-semibold text-[#9b3f42]">{data.demand.toFixed(1)} MW</span>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
          <span className="text-slate-600">Net balance:</span>
          <span className={`font-bold ${isShortfall ? "text-[#9b3f42]" : "text-[#386c58]"}`}>
            {isShortfall ? `${netBalance} MW Deficit` : `+${netBalance} MW Surplus`}
          </span>
        </div>
      </div>

      <div className="mt-2.5 pt-2 border-t border-slate-100 grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-slate-600">
        <div>
          <span className="text-slate-400">Cloud cover:</span> <span className="font-medium text-slate-700">{data.cloudCover}%</span>
        </div>
        <div>
          <span className="text-slate-400">GHI:</span> <span className="font-medium text-slate-700">{data.irradiance} W/m²</span>
        </div>
        {data.temperature && (
          <div>
            <span className="text-slate-400">Temp:</span> <span className="font-medium text-slate-700">{data.temperature}°C</span>
          </div>
        )}
        {data.confidenceScore && (
          <div>
            <span className="text-slate-400">Confidence:</span> <span className="font-medium text-slate-700">{data.confidenceScore}%</span>
          </div>
        )}
      </div>

      {canInspect && <p className="mt-2 text-[10px] text-slate-400 italic">Click point to inspect full causal analysis</p>}
    </div>
  );
}
