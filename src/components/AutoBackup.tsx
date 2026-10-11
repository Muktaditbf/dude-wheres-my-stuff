/** Auto-backup controls (Settings) and the "resume" reminder (Home). */
import { FileCheck } from 'lucide-react';
import { resume, turnOff, turnOn, useAutoBackup } from '../lib/autobackup';
import { ago } from '../lib/time';
import { useToast } from './Toasts';
import { Button } from './ui';

export function AutoBackupPanel() {
  const backup = useAutoBackup();
  const toast = useToast();

  if (backup.status === 'unsupported') {
    return (
      <p className="font-semibold text-muted">
        💾 Auto-backup to a file needs Chrome or Edge on a computer. Here, use “Download backup” now
        and then.
      </p>
    );
  }

  if (backup.status === 'off') {
    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <p className="flex-1 font-semibold">
          💾 <strong>Auto-backup:</strong> keep one file on your computer always up to date, so your
          stuff survives even if you clear your browser data.
        </p>
        <Button
          tone="lime"
          icon={<FileCheck size={16} strokeWidth={2.75} aria-hidden="true" />}
          onClick={async () => {
            if (await turnOn())
              toast({
                message: 'Auto-backup is on. Every change is saved to your file. 💾',
                tone: 'lime',
              });
          }}
        >
          Turn on auto-backup
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <p className="flex-1 font-semibold">
        💾 Auto-backup to <code className="font-bold">{backup.fileName}</code>:{' '}
        {backup.status === 'on' && (backup.savedAt ? `saved ${ago(backup.savedAt)}` : 'on')}
        {backup.status === 'paused' && 'paused until you allow it again.'}
        {backup.status === 'error' && 'could not write the file. Was it moved or deleted?'}
      </p>
      <div className="flex gap-2">
        {backup.status !== 'on' && (
          <Button tone="lime" size="sm" onClick={backup.status === 'error' ? turnOn : resume}>
            {backup.status === 'error' ? 'Pick file again' : 'Resume'}
          </Button>
        )}
        <Button size="sm" onClick={turnOff}>
          Turn off
        </Button>
      </div>
    </div>
  );
}

/** Browsers forget file permission after a restart; one click brings it back. */
export function AutoBackupReminder() {
  const backup = useAutoBackup();
  if (backup.status !== 'paused') return null;
  return (
    <aside className="sticker-sm mt-6 flex flex-col gap-3 bg-cyan p-4 text-on-accent sm:flex-row sm:items-center">
      <p className="flex-1 font-bold">
        💾 Auto-backup is paused. Your browser needs one click to keep saving to your file.
      </p>
      <Button tone="plain" size="sm" onClick={resume}>
        Resume backup
      </Button>
    </aside>
  );
}
