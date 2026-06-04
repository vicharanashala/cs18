import { useState } from 'react';
import {
  FileText, Image, Video, Music, Download, Eye, X, ExternalLink,
  ZoomIn, Play, Pause
} from 'lucide-react';
import axiosClient from '../api/axiosClient';

function formatSize(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds) {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function FileIcon({ type, size = 18 }) {
  if (type?.startsWith('image/'))  return <Image    size={size} className="text-cyan-400" />;
  if (type?.startsWith('video/'))  return <Video    size={size} className="text-violet-400" />;
  if (type?.startsWith('audio/'))  return <Music    size={size} className="text-emerald-400" />;
  if (type?.includes('pdf'))       return <FileText size={size} className="text-red-400" />;
  if (type?.includes('word'))      return <FileText size={size} className="text-blue-400" />;
  return <FileText size={size} className="text-slate-400" />;
}

function isImage(type) { return type?.startsWith('image/'); }
function isVideo(type) { return type?.startsWith('video/'); }
function isAudio(type) { return type?.startsWith('audio/'); }
function isPDF(type)   { return type?.includes('pdf'); }
function isDocX(type)  { return type?.includes('word'); }

function getFileUrl(relativeUrl) {
  if (!relativeUrl) return '';
  if (relativeUrl.startsWith('http')) return relativeUrl;
  const base = axiosClient.defaults.baseURL?.replace(/\/$/, '') || '';
  return `${base}${relativeUrl}`;
}

// ── Single attachment row ──────────────────────────────────────────────────────
function AttachmentItem({ att, compact = false, onRemove, showUploader = false }) {
  const [playing, setPlaying] = useState(false);
  const fileUrl = getFileUrl(att.fileUrl);
  const type = att.fileType;

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] ${compact ? 'py-2 px-3' : ''}`}>
      {/* Icon */}
      <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center">
        <FileIcon type={type} size={16} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-300 font-bricolage truncate leading-snug">
          {att.fileName}
        </p>
        <div className="flex items-center gap-2 flex-wrap mt-0.5">
          <span className="text-[10px] text-slate-600 font-bricolage">{formatSize(att.fileSize)}</span>
          {att.duration && (
            <span className="text-[10px] text-slate-700 font-bricolage">{formatDuration(att.duration)}</span>
          )}
          {!compact && showUploader && att.uploadedBy && (
            <span className="text-[10px] text-amber-500/50 font-bricolage">
              by {typeof att.uploadedBy === 'object' ? att.uploadedBy.username || att.uploadedBy.email : 'User'}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* View */}
        {isImage(type) && (
          <a href={fileUrl} target="_blank" rel="noreferrer"
            className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-400 hover:bg-cyan-400/10 transition-all"
            title="View image">
            <ZoomIn size={13} />
          </a>
        )}
        {(isVideo(type) || isAudio(type)) && (
          <button
            onClick={() => setPlaying(p => !p)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-violet-400 hover:bg-violet-400/10 transition-all"
            title={playing ? 'Pause' : 'Play'}
          >
            {playing ? <Pause size={13} /> : <Play size={13} />}
          </button>
        )}
        {/* Download */}
        <a href={fileUrl} download={att.fileName}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/10 transition-all"
          title="Download">
          <Download size={13} />
        </a>
        {/* Open */}
        <a href={fileUrl} target="_blank" rel="noreferrer"
          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-400/10 transition-all"
          title="Open in new tab">
          <ExternalLink size={13} />
        </a>
        {/* Remove */}
        {onRemove && (
          <button onClick={() => onRemove(att._id)}
            className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
            title="Remove">
            <X size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Media preview modal ───────────────────────────────────────────────────────
function MediaModal({ att, onClose }) {
  const fileUrl = getFileUrl(att.fileUrl);
  const isVid = isVideo(att.fileType);
  const isAud = isAudio(att.fileType);
  const isImg = isImage(att.fileType);
  const isP = isPDF(att.fileType);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}>
      <div className="relative max-w-3xl w-full glass-strong rounded-3xl border border-white/10 overflow-hidden"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
          <p className="text-sm font-semibold text-slate-200 font-bricolage truncate pr-4">{att.fileName}</p>
          <div className="flex items-center gap-2 flex-shrink-0">
            <a href={fileUrl} download={att.fileName}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/10 transition-all">
              <Download size={14} />
            </a>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/10 transition-all">
              <X size={14} />
            </button>
          </div>
        </div>
        {/* Body */}
        <div className="flex items-center justify-center bg-black/40" style={{ maxHeight: '60vh' }}>
          {isImg && (
            <img src={fileUrl} alt={att.fileName} className="max-w-full max-h-[60vh] object-contain" />
          )}
          {isVid && (
            <video
              src={fileUrl} controls autoPlay className="max-w-full max-h-[60vh]"
              style={{ outline: 'none' }}
            />
          )}
          {isAud && (
            <div className="w-full max-w-md py-8 px-6">
              <Music size={36} className="text-emerald-400 mx-auto mb-4" />
              <audio src={fileUrl} controls autoPlay className="w-full" />
            </div>
          )}
          {isP && (
            <iframe src={fileUrl} className="w-full h-[60vh]" title={att.fileName} />
          )}
          {isDocX(att.fileType) && (
            <div className="py-12 px-8 text-center">
              <FileText size={40} className="text-blue-400 mx-auto mb-3" />
              <p className="text-sm text-slate-300 font-bricolage mb-2">{att.fileName}</p>
              <a href={fileUrl} download={att.fileName}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 text-sm font-semibold font-bricolage transition-all">
                <Download size={14} /> Download DOCX
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Multiple attachments list ─────────────────────────────────────────────────
export default function AttachmentDisplay({
  attachments = [],
  compact = false,
  onRemove,
  showUploader = false,
  title,
}) {
  const [previewAtt, setPreviewAtt] = useState(null);

  if (!attachments || attachments.length === 0) return null;

  return (
    <>
      <div className="space-y-1.5">
        {title && (
          <div className="flex items-center gap-2 mb-2">
            <FileText size={12} className="text-slate-600" />
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest font-bricolage">{title}</span>
          </div>
        )}
        {attachments.map(att => (
          <div key={att._id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <FileIcon type={att.fileType} size={18} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-300 font-bricolage truncate">{att.fileName}</p>
              <div className="flex items-center gap-3 flex-wrap mt-0.5">
                <span className="text-xs text-slate-600 font-bricolage">{formatSize(att.fileSize)}</span>
                {att.duration && (
                  <span className="text-xs text-slate-700 font-bricolage">{formatDuration(att.duration)}</span>
                )}
                {showUploader && att.uploadedBy && (
                  <span className="text-xs text-amber-500/50 font-bricolage">
                    by {typeof att.uploadedBy === 'object' ? att.uploadedBy.username || att.uploadedBy.email : ''}
                  </span>
                )}
                {att.createdAt && (
                  <span className="text-xs text-slate-700 font-bricolage">
                    {new Date(att.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {isImage(att.fileType) && (
                <button onClick={() => setPreviewAtt(att)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-400 hover:bg-cyan-400/10 transition-all"
                  title="Preview Image">
                  <ZoomIn size={14} />
                </button>
              )}
              {isPDF(att.fileType) && (
                <button onClick={() => setPreviewAtt(att)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all"
                  title="Preview PDF">
                  <Eye size={14} />
                </button>
              )}
              {(isVideo(att.fileType) || isAudio(att.fileType)) && (
                <button onClick={() => setPreviewAtt(att)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-violet-400 hover:bg-violet-400/10 transition-all"
                  title="Play Media">
                  {isVideo(att.fileType) ? <Play size={14} /> : <Music size={14} />}
                </button>
              )}
              <a href={getFileUrl(att.fileUrl)} download={att.fileName}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/10 transition-all"
                title="Download">
                <Download size={14} />
              </a>
              <a href={getFileUrl(att.fileUrl)} target="_blank" rel="noreferrer"
                className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-400/10 transition-all"
                title="Open in new tab">
                <ExternalLink size={14} />
              </a>
              {onRemove && (
                <button onClick={() => onRemove(att._id)}
                  className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  title="Remove">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {previewAtt && <MediaModal att={previewAtt} onClose={() => setPreviewAtt(null)} />}
    </>
  );
}