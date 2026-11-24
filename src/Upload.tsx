import { useRef, useState } from 'react';
import { api } from './api';
import { Icon } from './icons';
import { useToast } from './ui';

/** Picks image files, uploads them through the API (to Cloudflare R2) and hands back their public URLs. */
export function UploadButton({ folder, kind = 'image', multiple, label = 'Upload', quiet, tile, onUploaded }: {
  folder: string;
  kind?: 'image' | 'video';
  multiple?: boolean;
  label?: string;
  /** A plain text action instead of a bordered button. */
  quiet?: boolean;
  /** A large dashed drop-in tile. */
  tile?: boolean;
  onUploaded: (urls: string[]) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const pick = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    const urls: string[] = [];
    try {
      // One at a time: keeps the order and stops at the first problem.
      for (const file of Array.from(files)) urls.push(await api.upload(file, folder, kind));
      onUploaded(urls);
    } catch (e) {
      toast(`${(e as Error).message}${urls.length ? ` (${urls.length} uploaded before that)` : ''}`, 'error');
      if (urls.length) onUploaded(urls);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <>
      <input ref={input} type="file" hidden multiple={multiple} accept={kind === 'video' ? 'video/mp4,video/webm' : 'image/jpeg,image/png,image/webp,image/avif,image/gif'} onChange={(e) => void pick(e.target.files)} />
      {tile ? (
        <button type="button" className="img" disabled={busy} onClick={() => input.current?.click()} style={{ width: 132, height: 132, flexDirection: 'column', justifyContent: 'center', borderStyle: 'dashed', background: 'none' }}>
          <Icon name="upload" size={20} />
          {busy ? 'Uploading…' : label}
        </button>
      ) : (
        <button type="button" className={quiet ? 'text' : ''} disabled={busy} onClick={() => input.current?.click()}>
          {!quiet && <Icon name="upload" />}{busy ? 'Uploading…' : label}
        </button>
      )}
    </>
  );
}
