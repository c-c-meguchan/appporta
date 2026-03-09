'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getMainOriginClient } from '@/lib/constants';
import { useAppChanges } from '@/context/AppChangesContext';

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M21.731 2.269a2.625 2.625 0 0 0-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 0 0 0-3.712ZM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 0 0-1.32 2.214l-.8 2.685a.75.75 0 0 0 .933.933l2.685-.8a5.25 5.25 0 0 0 2.214-1.32l8.4-8.4Z" />
      <path d="M5.25 5.25a3 3 0 0 0-3 3v10.5a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3V13.5a.75.75 0 0 0-1.5 0v5.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V8.25a1.5 1.5 0 0 1 1.5-1.5h5.25a.75.75 0 0 0 0-1.5H5.25Z" />
    </svg>
  );
}

function GearIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 0 0-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 0 0-2.282.819l-.922 1.597a1.875 1.875 0 0 0 .432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 0 0 0 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 0 0-.432 2.385l.922 1.597a1.875 1.875 0 0 0 2.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.116-.114.283-.125.45-.082l1.02.382a1.875 1.875 0 0 0 2.28-.819l.923-1.597a1.875 1.875 0 0 0-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 0 0 0-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 0 0-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 0 0-.985-.57c-.182-.088-.277-.228-.297-.35l-.179-1.072a1.875 1.875 0 0 0-1.85-1.567h-1.843ZM12 15.75a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5Z" clipRule="evenodd" />
    </svg>
  );
}

function EqualizerIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M10 20h4V4h-4v16zm-6 0h4v-8H4v8zM16 9v11h4V9h-4z" />
    </svg>
  );
}

function ChatBubbleIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path fillRule="evenodd" d="M4.848 2.771A49.144 49.144 0 0 1 12 2.25c2.43 0 4.817.178 7.152.52 1.978.29 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.68-3.348 3.97a48.901 48.901 0 0 1-3.476.383.39.39 0 0 0-.297.17l-2.755 4.133a.75.75 0 0 1-1.248 0l-2.755-4.133a.39.39 0 0 0-.297-.17 48.9 48.9 0 0 1-3.476-.384c-1.978-.29-3.348-2.024-3.348-3.97V6.741c0-1.946 1.37-3.68 3.348-3.97ZM6.75 8.25a.75.75 0 0 1 .75-.75h9a.75.75 0 0 1 0 1.5h-9a.75.75 0 0 1-.75-.75Zm.75 2.25a.75.75 0 0 0 0 1.5h5.25a.75.75 0 0 0 0-1.5H7.5Z" clipRule="evenodd" />
    </svg>
  );
}

const BUTTON_CLASS = {
  primary:
    'rounded-lg border-[0.7px] border-zinc-300 bg-zinc-900 px-4 py-1.5 text-xs font-medium text-zinc-50 transition hover:bg-zinc-800 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200',
  secondary:
    'rounded-lg border-[0.7px] border-zinc-300 bg-white px-4 py-1.5 text-xs font-medium text-zinc-800 transition hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800',
};

export type AppPageHeaderTab = 'edit' | 'settings' | 'analytics' | 'testimonials';

export type AppPageHeaderProps = {
  appID: string;
  isPublished: boolean;
  onSave?: () => void | Promise<void>;
  onPublish?: () => void | Promise<void>;
  onUnpublish?: () => void | Promise<void>;
  saving?: boolean;
  publishing?: boolean;
};

export function AppPageHeader({
  appID,
  isPublished,
  onSave,
  onPublish,
  onUnpublish,
  saving = false,
  publishing = false,
}: AppPageHeaderProps) {
  const pathname = usePathname();
  const changes = useAppChanges();
  const editDirty = changes?.editDirty ?? false;
  const settingsUrlPending = changes?.settingsUrlPending ?? false;
  const testimonialsDirty = changes?.testimonialsDirty ?? false;
  const hasAnyPending = editDirty || settingsUrlPending || testimonialsDirty;

  const base = `/apps/${appID}`;
  // 常に現在のルート appID で公開URLを組み立て、リダイレクト後も即反映
  const publicUrl = `${getMainOriginClient()}/${appID}`;

  const tabs: { id: AppPageHeaderTab; href: string; label: string; Icon: React.ComponentType<{ className?: string }>; badge?: boolean }[] = [
    { id: 'edit', href: `${base}/edit`, label: 'エディター', Icon: PencilIcon, badge: editDirty },
    { id: 'settings', href: `${base}/settings`, label: '設定', Icon: GearIcon, badge: settingsUrlPending },
    { id: 'testimonials', href: `${base}/testimonials`, label: 'ユーザーの声', Icon: ChatBubbleIcon, badge: testimonialsDirty },
    { id: 'analytics', href: `${base}/analytics`, label: 'アナリティクス', Icon: EqualizerIcon },
  ];

  const currentTab = tabs.find((t) => pathname === t.href || pathname.startsWith(t.href + '/'))?.id ?? 'edit';

  const handleUpdateClick = async () => {
    if (settingsUrlPending) {
      changes?.setShowUrlConfirm(true);
      return;
    }
    if (onSave) {
      void onSave();
    }
    if (testimonialsDirty) {
      await changes?.applyTestimonialChanges();
    }
    if (editDirty) {
      changes?.setEditDirty(false);
    }
  };

  const isUpdating = saving || publishing;

  const renderActions = () => {
    if (isPublished) {
      return (
        <>
          <button
            type="button"
            onClick={handleUpdateClick}
            disabled={!hasAnyPending || isUpdating}
            className={BUTTON_CLASS.primary}
            title={!hasAnyPending ? '変更があると更新できます' : undefined}
          >
            {isUpdating ? '更新中...' : '更新'}
          </button>
          {onUnpublish != null && (
            <button
              type="button"
              onClick={onUnpublish}
              disabled={publishing}
              className={BUTTON_CLASS.secondary}
            >
              {publishing ? '反映中...' : '非公開'}
            </button>
          )}
        </>
      );
    }
    if (hasAnyPending || onSave != null) {
      return (
        <button
          type="button"
          onClick={handleUpdateClick}
          disabled={(!hasAnyPending && onSave == null) || isUpdating}
          className={BUTTON_CLASS.primary}
        >
          {isUpdating ? '更新中...' : '更新'}
        </button>
      );
    }
    if (onPublish != null) {
      return (
        <button
          type="button"
          onClick={onPublish}
          disabled={publishing || saving}
          className={BUTTON_CLASS.primary}
        >
          {publishing ? '公開中...' : '公開'}
        </button>
      );
    }
    return null;
  };

  return (
    <header className="flex items-center justify-between gap-4 border-b-[0.7px] border-zinc-200 bg-white px-4 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${
              isPublished ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-zinc-400 dark:bg-zinc-500'
            }`}
            title={isPublished ? '公開中' : '非公開'}
            aria-hidden
          />
          <Link
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate text-xs text-zinc-500 transition-colors hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
          >
            {publicUrl}
          </Link>
        </div>
        <nav className="flex shrink-0 items-center gap-0.5" aria-label="アプリメニュー">
          {tabs.map(({ id, href, label, Icon, badge }) => {
            const isActive = currentTab === id;
            return (
              <Link
                key={id}
                href={href}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition ${
                  isActive
                    ? 'bg-zinc-200 text-zinc-900 dark:bg-zinc-600 dark:text-zinc-100'
                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
                }`}
                title={label}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">{label}</span>
                {badge && (
                  <span
                    className="h-2 w-2 shrink-0 rounded-full bg-orange-500 dark:bg-orange-400"
                    title="未反映の変更あり"
                    aria-hidden
                  />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex shrink-0 items-center gap-2">{renderActions()}</div>
    </header>
  );
}
