import React from 'react';
import { cn } from '@/lib/utils';
import { pageShellClass, pageStackClass } from '@/components/layout/mobileLayout';

interface PageShellProps {
  children: React.ReactNode;
  className?: string;
  /** Extra classes on the inner stack (spacing wrapper). */
  stackClassName?: string;
  as?: 'main' | 'div';
}

/** Consistent page container: no horizontal bleed, shared vertical rhythm. */
export function PageShell({
  children,
  className,
  stackClassName,
  as: Tag = 'main',
}: PageShellProps) {
  return (
    <Tag className={cn(pageShellClass, className)}>
      <div className={cn(pageStackClass, stackClassName)}>{children}</div>
    </Tag>
  );
}
