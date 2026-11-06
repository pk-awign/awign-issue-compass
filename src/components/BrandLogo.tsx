import { cn } from '@/lib/utils';

interface BrandLogoProps {
  className?: string;
}

/**
 * Awign wordmark.
 *
 * The source asset is a white-on-transparent SVG at 88x31 (2.8:1), so it needs a
 * dark plate behind it and must keep its aspect ratio. Previously each header
 * forced it into a 32x32 square, which shrank the wordmark into an unreadable
 * smudge on small screens.
 */
export function BrandLogo({ className }: BrandLogoProps) {
  return (
    <div className={cn('shrink-0 rounded-md bg-gray-800 px-2 py-1', className)}>
      <img
        src="/awign-logo.svg"
        alt="Awign"
        width={88}
        height={31}
        className="h-5 w-auto sm:h-6"
      />
    </div>
  );
}

export default BrandLogo;
