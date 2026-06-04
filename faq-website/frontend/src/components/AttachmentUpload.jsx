import { useState, useRef, useCallback } from 'react';
import { Upload, X, FileText, Image, Video, Music, File, AlertCircle, CheckCircle2 } from 'lucide-react';
import axiosClient from '../api/axiosClient';

const ACCEPTED = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png', 'image/jpeg',
  'video/mp4', 'video/quicktime', 'video/webm',
  'audio/mpeg', 'audio/wav', 'audio/mp4',
];

const ACCEPT_LABELS = {
  'application/pdf': 'PDF', 'image/png': 'PNG', 'image/jpeg': 'JPG / JPEG',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'video/mp4': 'MP4', 'video/quicktime': 'MOV', 'video/webm': 'WEBM',
  'audio/mpeg': 'MP3', 'audio/wav': 'WAV', 'audio/mp4': 'M4A',
};

const ACCEPT_STRING = ACCEPTED.join(',');

const MB = 1024 * 1024;
const MAX_FILES = 5;
const MAX_VIDEOS = 2;

function formatSize(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < MB)   return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / MB).toFixed(1)} MB`;
}

function FileIcon({ type }) {
  if (type?.startsWith('image/'))     return <Image      size={20} className="text-cyan-400" />;
  if (type?.startsWith('video/'))     return <Video      size={20} className="text-violet-400" />;
  if (type?.startsWith('audio/'))     return <Music      size={20} className="text-emerald-400" />;
  if (type?.includes('pdf'))          return <FileText   size={20} className="text-red-400" />;
  if (type?.includes('word'))         return <FileText   size={20} className="text-blue-400" />;
  return <File size={20} className="text-slate-400" />;
}

export default function AttachmentUpload({ attachments = [], onChange, maxFiles = MAX_FILES, maxVideos = MAX_VIDEOS }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({});
  const [errors, setErrors] = useState([]);
  const inputRef = useRef();

  const videoCount = attachments.filter(a => a.fileType?.startsWith('video/')).length;

  const getVideoDuration = (file) => new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    video.src = window.URL.createObjectURL(file);
  });

  function validate(files) {
    const errs = [];
    const remaining = maxFiles - attachments.length;
    if (files.length > remaining) {
      errs.push(`Maximum ${maxFiles} files allowed (${remaining} slot${remaining === 1 ? '' : 's'} left).`);
      files = Array.from(files).slice(0, remaining);
    }
    const vidCount = Array.from(files).filter(f => f.type?.startsWith('video/')).length;
    if (videoCount + vidCount > maxVideos) {
      const remainingVids = maxVideos - videoCount;
      errs.push(`Maximum ${maxVideos} videos allowed (${remainingVids} slot${remainingVids === 1 ? '' : 's'} left).`);
    }
    for (const file of files) {
      if (!ACCEPTED.includes(file.type)) {
        errs.push(`"${file.name}" — type not allowed.`);
      }
    }
    return { errs, files: Array.from(files) };
  }

  const uploadFiles = useCallback(async (files) => {
    const { errs, files: validFiles } = validate(files);
    if (errs.length) { setErrors(errs); return; }
    
    const finalFiles = [];
    const durations = [];
    const validationErrs = [];
    
    for (const f of validFiles) {
      if (f.type.startsWith('video/')) {
        const dur = await getVideoDuration(f);
        if (dur > 60) {
          validationErrs.push(`"${f.name}" — Video must be less than 60 seconds.`);
        } else {
          finalFiles.push(f);
          durations.push(dur);
        }
      } else {
        finalFiles.push(f);
        durations.push(null);
      }
    }

    if (validationErrs.length) {
      setErrors(validationErrs);
      return;
    }

    if (finalFiles.length === 0) return;

    setErrors([]);
    setUploading(true);

    const formData = new FormData();
    finalFiles.forEach((f, i) => {
      formData.append('files', f);
      // Append for each file to maintain parallel arrays in the backend if needed
      formData.append('duration_files', durations[i] || '');
    });

    try {
      const res = await axiosClient.post('/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) setProgress(p => ({ ...p, __total: Math.round((e.loaded / e.total) * 100) }));
        },
      });
      const newAttachments = res.data.attachments || [];
      onChange([...attachments, ...newAttachments]);
    } catch (err) {
      setErrors([err.response?.data?.error || 'Upload failed.']);
    } finally {
      setUploading(false);
      setProgress({});
    }
  }, [attachments, maxFiles, maxVideos, videoCount, onChange]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const files = e.dataTransfer?.files;
    if (files?.length) uploadFiles(files);
  }, [uploadFiles]);

  const handleDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = () => setDragging(false);

  function removeAttachment(id) {
    onChange(attachments.filter(a => a._id !== id));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest font-bricolage">
          Attachments
        </span>
        <span className="text-[10px] text-slate-600 font-bricolage">
          {attachments.length}/{maxFiles} files
          <span className="ml-2 text-amber-500/60">· {videoCount}/{maxVideos} videos</span>
        </span>
      </div>

      {/* Drop zone */}
      {attachments.length < maxFiles && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
          className={`relative flex flex-col items-center justify-center gap-2 py-8 px-6 rounded-2xl border-2 border-dashed cursor-pointer transition-all select-none
            ${dragging
              ? 'border-amber-400/60 bg-amber-400/5'
              : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'}
          `}
        >
          {uploading ? (
            <>
              <div className="w-8 h-8 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
              <p className="text-xs text-slate-500 font-bricolage">
                Uploading… {progress.__total != null ? `${progress.__total}%` : ''}
              </p>
            </>
          ) : (
            <>
              <Upload size={20} className="text-slate-600" />
              <p className="text-xs text-slate-500 font-bricolage text-center">
                <span className="text-slate-400 font-semibold">Click to browse</span> or drag & drop
              </p>
              <p className="text-[10px] text-slate-700 font-bricolage text-center">
                PDF, DOCX, PNG, JPG, MP4, MOV, WEBM, MP3, WAV, M4A · max {MAX_FILES} files
              </p>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPT_STRING}
            className="hidden"
            onChange={e => { if (e.target.files?.length) uploadFiles(e.target.files); e.target.value = ''; }}
          />
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-red-500/5 border border-red-500/10">
          <AlertCircle size={13} className="text-red-400 mt-0.5 flex-shrink-0" />
          <div className="space-y-0.5">
            {errors.map((e, i) => (
              <p key={i} className="text-xs text-red-400 font-bricolage">{e}</p>
            ))}
          </div>
        </div>
      )}

      {/* File list */}
      {attachments.length > 0 && (
        <div className="space-y-1.5">
          {attachments.map(att => (
            <div key={att._id} className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] group">
              <FileIcon type={att.fileType} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-300 font-bricolage truncate">{att.fileName}</p>
                <p className="text-[10px] text-slate-600 font-bricolage">
                  {formatSize(att.fileSize)}
                  {att.duration ? ` · ${Math.round(att.duration)}s` : ''}
                </p>
              </div>
              {att.thumbnailUrl && (
                <img src={att.thumbnailUrl} alt="" className="w-10 h-10 rounded-lg object-cover border border-white/10" />
              )}
              <button
                type="button"
                onClick={() => removeAttachment(att._id)}
                className="p-1 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}