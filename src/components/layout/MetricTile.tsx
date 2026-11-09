import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  metricIconClass,
  metricLabelClass,
  metricValueClass,
} from '@/components/layout/mobileLayout';

interface MetricTileProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactElement<{ className?: string }>;
  hint?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  valueClassName?: string;
  iconClassName?: string;
}

/** Compact KPI tile used on Overview / Analytics / ticket status strips. */
export function MetricTile({
  label,
  value,
  icon,
  hint,
  className,
  contentClassName,
  valueClassName,
  iconClassName,
}: MetricTileProps) {
  return (
    <Card className={cn('min-w-0', className)}>
      <CardContent className={cn('p-3 sm:p-4', contentClassName)}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className={metricLabelClass}>{label}</p>
            <p className={cn(metricValueClass, 'mt-0.5', valueClassName)}>{value}</p>
            {hint ? (
              <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
            ) : null}
          </div>
          {icon
            ? React.cloneElement(icon, {
                className: cn(metricIconClass, icon.props.className, iconClassName),
              })
            : null}
        </div>
      </CardContent>
    </Card>
  );
}
