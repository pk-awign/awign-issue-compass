import React from 'react';

/** Solid fills — CSS variables often fail inside Recharts SVG text/bar fills. */
export const CHART_INK = '#0f172a';
export const CHART_MUTED_INK = '#334155';
export const CHART_BAR_PRIMARY = '#475569';
export const CHART_BAR_SECONDARY = '#64748b';
export const CHART_GRID = '#e2e8f0';
export const CHART_TICK = { fontSize: 12, fill: CHART_MUTED_INK };

export const VERTICAL_BAR_MARGIN_DESKTOP = { top: 12, right: 80, left: 4, bottom: 8 };
export const VERTICAL_BAR_MARGIN_MOBILE = { top: 8, right: 52, left: 2, bottom: 4 };

export const CHART_ANIMATION = {
  isAnimationActive: true,
  animationBegin: 0,
  animationDuration: 500,
  animationEasing: 'ease-out' as const,
};

/** Leave headroom so counts beside bars are never clipped. */
export function barDomainMax(dataMax: number): number {
  if (!Number.isFinite(dataMax) || dataMax <= 0) return 1;
  return Math.ceil(dataMax * 1.4);
}

export function ticketCountLabel(count: number): string {
  return `${count} ticket${count === 1 ? '' : 's'}`;
}

export function verticalBarMargin(isMobile: boolean) {
  return isMobile ? VERTICAL_BAR_MARGIN_MOBILE : VERTICAL_BAR_MARGIN_DESKTOP;
}

export function ellipsizeLabel(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(0, max - 1))}…`;
}

export function makePieValueLabel(compact: boolean) {
  return (props: {
    cx?: number;
    cy?: number;
    midAngle?: number;
    outerRadius?: number;
    percent?: number;
    value?: number;
  }) => {
    const { cx = 0, cy = 0, midAngle = 0, outerRadius = 0, percent = 0, value = 0 } = props;
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + (percent < 0.05 ? (compact ? 22 : 30) : compact ? 14 : 20);
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const pctText =
      percent < 0.01 ? '<1%' : `${(percent * 100).toFixed(percent < 0.05 ? 1 : 0)}%`;
    return (
      <text
        x={x}
        y={y}
        fill={CHART_INK}
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={compact ? 10 : percent < 0.05 ? 11 : 12}
        fontWeight={700}
      >
        {compact ? value : `${value} (${pctText})`}
      </text>
    );
  };
}

/** Count beside each horizontal bar. */
export function makeBarCountLabel(compact: boolean) {
  return (props: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    value?: number | string;
  }) => {
    const { x = 0, y = 0, width = 0, height = 0, value } = props;
    if (value === undefined || value === null || value === '') return null;
    return (
      <text
        x={Number(x) + Number(width) + (compact ? 6 : 8)}
        y={Number(y) + Number(height) / 2}
        fill={CHART_INK}
        fontSize={compact ? 11 : 13}
        fontWeight={700}
        dominantBaseline="middle"
        textAnchor="start"
      >
        {value}
      </text>
    );
  };
}
