/** Shared mobile / responsive layout class tokens for the portal. */

export const pageShellClass =
  'container mx-auto w-full min-w-0 overflow-x-hidden py-4 md:py-8';

export const pageStackClass = 'min-w-0 space-y-4 md:space-y-6';

export const pageFooterClass =
  'container mx-auto w-full text-center text-xs text-muted-foreground md:text-sm';

/** Admin / role tab triggers — wrap on phone, single line from md. */
export const tabTriggerClass =
  'w-full rounded-lg px-1.5 py-2 text-center text-xs leading-tight data-[state=active]:bg-white data-[state=active]:font-bold data-[state=active]:shadow sm:px-2 sm:text-sm md:whitespace-nowrap lg:px-3';

export const tabsListClass =
  'my-3 grid w-full grid-cols-2 gap-1.5 rounded-xl border bg-muted p-1.5 shadow-md md:my-4 md:gap-0 md:p-1';

export const metricGridClass = 'grid grid-cols-2 gap-3 md:gap-4';

export const metricValueClass = 'text-xl font-bold tabular-nums sm:text-2xl';

export const metricLabelClass = 'text-xs font-medium text-muted-foreground sm:text-sm';

export const metricIconClass = 'h-4 w-4 shrink-0 text-muted-foreground sm:h-5 sm:w-5';

export const cardTitleMobileClass =
  'min-w-0 truncate text-base font-semibold sm:text-lg';

export const cardMetaRowClass = 'flex min-w-0 flex-wrap items-center gap-2';

export const denseStripClass =
  'flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory md:grid md:overflow-visible md:pb-0';

export const denseStripItemClass =
  'min-w-[9.5rem] shrink-0 snap-start md:min-w-0 md:shrink';

export const chartCardHeaderClass =
  'flex flex-wrap items-start justify-between gap-2';

export const chartCardTitleClass =
  'flex min-w-0 items-center gap-2 text-base font-semibold sm:text-lg';

/** Fixed dialog chrome — height/width stay constant across tabs and content. */
export const modalViewportClass =
  '!flex h-[90dvh] max-h-[90dvh] w-[min(96vw,72rem)] flex-col overflow-hidden p-0 sm:rounded-lg';

export const tableScrollClass = 'max-h-[300px] overflow-auto';
