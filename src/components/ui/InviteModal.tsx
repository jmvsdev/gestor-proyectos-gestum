import { useEffect, useState } from 'react';
import { get, set, update, ref } from 'firebase/database';
import type { User } from 'firebase/auth';
import { X, Link, Users, Check, Copy } from 'lucide-react';
import { db, projectMetaRef, invitationRef } from '../../firebase';

export interface InvitationRecord {
  projectId: string;
  fromUid: string;
  toEmail: string;
  createdAt: number;
  status: 'pending' | 'accepted' | 'rejected';
}

interface Member { uid: string; label: string; isOwner: boolean; }

interface InviteModalProps {
  projectId: string;
  projectName: string;
  user: User;
  accentColor: string;
  onClose: () => void;
}

export function InviteModal({ projectId, projectName, user, accentColor, onClose }: InviteModalProps) {
  const [members, setMembers]     = useState<Member[]>([]);
  const [link, setLink]           = useState<string | null>(null);
  const [copied, setCopied]       = useState(false);
  const [generating, setGenerating] = useState(false);

  // Load current members on open
  useEffect(() => {
    get(projectMetaRef(projectId))
      .then(snap => {
        if (!snap.exists()) return;
        const meta = snap.val() as { ownerUid: string; members?: Record<string, boolean> };
        const ownerUid = meta.ownerUid ?? '';
        const memberUids = Object.keys(meta.members ?? {});
        setMembers(memberUids.map(uid => ({
          uid,
          label: uid === user.uid
            ? (user.displayName ?? user.email ?? uid.slice(0, 8))
            : uid.slice(0, 8) + '…',
          isOwner: uid === ownerUid,
        })));
      })
      .catch(() => {});
  }, [projectId, user.uid, user.displayName, user.email]);

  async function generateLink() {
    setGenerating(true);
    const token = crypto.randomUUID();
    const record: InvitationRecord = {
      projectId,
      fromUid:   user.uid,
      toEmail:   '',
      createdAt: Date.now(),
      status:    'pending',
    };
    try {
      await set(invitationRef(token), record);
      const url = `${window.location.origin}${window.location.pathname}?join=${token}`;
      setLink(url);
      await navigator.clipboard.writeText(url).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } finally {
      setGenerating(false);
    }
  }

  async function copyLink() {
    if (!link) return;
    await navigator.clipboard.writeText(link).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px] p-4">
      <div className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.18)] border border-[#eceef2] w-full max-w-[420px] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0f1f4]">
          <div className="flex items-center gap-2">
            <Users size={16} strokeWidth={2} style={{ color: accentColor }} />
            <span className="font-semibold text-[14px] text-[#272b36]">
              Compartir &ldquo;{projectName}&rdquo;
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#f3f4f7] text-[#8b909c] bg-transparent border-0 cursor-pointer transition-colors"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-4">
          {/* Generate / copy invite link */}
          <div className="flex flex-col gap-2">
            <p className="text-[12.5px] font-semibold text-[#4a4f5c]">Enlace de invitación</p>
            <p className="text-[11.5px] text-[#9aa0ad] leading-snug">
              Cualquier persona con este enlace podrá unirse al proyecto. Es de un solo uso.
            </p>

            {!link ? (
              <button
                type="button"
                onClick={generateLink}
                disabled={generating}
                className="flex items-center justify-center gap-2 w-full py-[9px] rounded-xl text-[13px] font-semibold text-white border-0 cursor-pointer transition-all disabled:opacity-60 disabled:cursor-not-allowed hover:brightness-110"
                style={{ background: accentColor }}
              >
                {generating ? (
                  <span className="w-[14px] h-[14px] rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <Link size={14} strokeWidth={2.2} />
                )}
                Generar enlace
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-[#f6f7f9] border border-[#e0e2e8] rounded-xl px-3 py-2">
                <span className="flex-1 text-[11.5px] text-[#4a4f5c] truncate font-mono">{link}</span>
                <button
                  type="button"
                  onClick={copyLink}
                  title="Copiar enlace"
                  className="flex items-center gap-1 text-[11.5px] font-semibold px-2 py-1 rounded-lg border-0 cursor-pointer transition-colors flex-shrink-0"
                  style={copied
                    ? { background: '#e8faf3', color: '#1f9d63' }
                    : { background: '#eceef2', color: '#4a4f5c' }}
                >
                  {copied ? <Check size={13} strokeWidth={2.5} /> : <Copy size={13} strokeWidth={2} />}
                  {copied ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            )}
          </div>

          {/* Current members */}
          {members.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="h-px bg-[#f0f1f4]" />
              <p className="text-[12.5px] font-semibold text-[#4a4f5c]">
                Miembros actuales ({members.length})
              </p>
              <div className="flex flex-col gap-1 max-h-[140px] overflow-y-auto">
                {members.map(m => (
                  <div key={m.uid} className="flex items-center gap-2 py-1">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                      style={{ background: m.uid === user.uid ? accentColor : '#9aa0ad' }}
                    >
                      {m.label[0]?.toUpperCase() ?? '?'}
                    </div>
                    <span className="text-[12.5px] text-[#272b36] truncate flex-1">{m.label}</span>
                    {m.isOwner && (
                      <span className="text-[10.5px] font-semibold text-[#9aa0ad] bg-[#f3f4f7] rounded-md px-1.5 py-px flex-shrink-0">
                        propietario
                      </span>
                    )}
                    {m.uid === user.uid && !m.isOwner && (
                      <span className="text-[10.5px] font-semibold text-[#5a67f2] bg-[#eef0ff] rounded-md px-1.5 py-px flex-shrink-0">
                        tú
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-5 pb-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-[9px] text-[13px] font-semibold text-[#4a4f5c] bg-[#f3f4f7] rounded-xl border-0 cursor-pointer hover:bg-[#eceef2] transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Exported helpers for App.tsx join flow ────────────────────────────────────

export async function acceptInvitation(token: string, uid: string): Promise<string | null> {
  const snap = await get(invitationRef(token));
  if (!snap.exists()) return null;
  const record = snap.val() as InvitationRecord;
  if (record.status !== 'pending') return null;

  const pid = record.projectId;
  await update(ref(db), {
    [`projects/${pid}/meta/members/${uid}`]: true,
    [`userProjects/${uid}/${pid}`]:          true,
    [`invitations/${token}/status`]:         'accepted',
  });

  return pid;
}

export async function readInvitationMeta(token: string): Promise<{ projectId: string; projectName: string } | null> {
  const invSnap = await get(invitationRef(token));
  if (!invSnap.exists()) return null;
  const record = invSnap.val() as InvitationRecord;
  if (record.status !== 'pending') return null;

  const metaSnap = await get(projectMetaRef(record.projectId));
  if (!metaSnap.exists()) return null;
  const meta = metaSnap.val() as { name: string };

  return { projectId: record.projectId, projectName: meta.name };
}
