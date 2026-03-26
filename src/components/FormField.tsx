import type { ReactNode } from 'react';

export const FORM_LABEL_CLASS = 'mb-1 block text-xs font-medium' + ' text-[var(--text-primary)] dark:text-[var(--text-primary)]';
export const FORM_INPUT_CLASS =
  'w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--input-focus-border)] focus:bg-[var(--input-focus-bg)] focus:ring-[0.7px] focus:ring-[var(--input-focus-ring)]';
export const FORM_ERROR_CLASS = 'mt-1 text-[11px] text-[var(--error)]';
export const PREFIX_INPUT_WRAPPER_CLASS =
  'relative';
export const PREFIX_TEXT_CLASS =
  'absolute left-2 top-1/2 transform -translate-y-1/2 text-xs text-[var(--text-secondary)] z-10';
export const PREFIX_INPUT_CLASS =
  'min-w-0 flex-1 rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] py-2 pl-6 pr-8 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--input-focus-border)] focus:bg-[var(--input-focus-bg)] focus:ring-[0.7px] focus:ring-[var(--input-focus-ring)]';

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

