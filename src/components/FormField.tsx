import type { ReactNode } from 'react';

export const FORM_LABEL_CLASS = 'mb-1 block text-xs font-medium text-zinc-800 dark:text-zinc-200';
export const FORM_INPUT_CLASS =
  'w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-500 focus:border-zinc-300 focus:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder:text-zinc-400 dark:focus:border-zinc-600 dark:focus:bg-zinc-700';
export const FORM_ERROR_CLASS = 'mt-1 text-[11px] text-red-500 dark:text-red-400';
export const PREFIX_INPUT_WRAPPER_CLASS =
  'flex min-w-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800';
export const PREFIX_TEXT_CLASS =
  'flex shrink-0 items-center border-r border-zinc-200 bg-zinc-100 px-3 py-2 text-xs text-zinc-600 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-400';
export const PREFIX_INPUT_CLASS =
  'min-w-0 flex-1 border-0 bg-transparent py-2 pl-3 pr-8 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:ring-0 dark:text-zinc-50 dark:placeholder:text-zinc-500';

export function FormLabel({
  htmlFor,
  children,
  optional = false,
}: {
  htmlFor: string;
  children: ReactNode;
  optional?: boolean;
}) {
  if (!optional) {
    return (
      <label htmlFor={htmlFor} className={FORM_LABEL_CLASS}>
        {children}
      </label>
    );
  }

  return (
    <div className="mb-1 inline-flex items-center gap-2">
      <label
        htmlFor={htmlFor}
        className="inline-flex items-center text-xs font-medium leading-none text-zinc-800 dark:text-zinc-200"
      >
        {children}
      </label>
      <span className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-medium leading-none text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
        任意
      </span>
    </div>
  );
}

