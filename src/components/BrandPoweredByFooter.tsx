import { BrandLogo } from '@/components/BrandLogo';
import { cn } from '@/lib/utils';

interface BrandPoweredByFooterProps {
  className?: string;
}

export function BrandPoweredByFooter({ className }: BrandPoweredByFooterProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 border-t border-gray-200 pt-6',
        className
      )}
    >
      <span className="text-xs font-medium uppercase tracking-wide text-gray-400">
        Powered by
      </span>
      <BrandLogo className="px-3 py-1.5 [&_img]:h-6 sm:[&_img]:h-7" />
    </div>
  );
}

export default BrandPoweredByFooter;
