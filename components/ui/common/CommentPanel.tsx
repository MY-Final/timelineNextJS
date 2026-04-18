"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Send, Heart, Trash2, Loader2, MessageSquare } from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/zh-cn";

dayjs.extend(relativeTime);
dayjs.locale("zh-cn");

// ── 类型 ──────────────────────────────────────────────
export interface CommentItem {
  id: number;
  post_id: number;
  parent_id: number | null;
  content: string;
  like_count: number;
  created_at: string;
  user_id: number;
  username: string;
  nickname: string;
  avatar: string | null;
  is_liked: boolean;
  reply_to_username: string | null;
  reply_to_nickname: string | null;
  // 前端组装
  replies?: CommentItem[];
}

interface Props {
  postId: number;
  postTitle: string;
  onClose: () => void;
  onCountChange?: (delta: number) => void;
}

// ── 相对时间 ───────────────────────────────────────────
function RelativeTime({ date }: { date: string }) {
  const [label, setLabel] = useState(() => dayjs(date).fromNow());
  useEffect(() => {
    const t = setInterval(() => setLabel(dayjs(date).fromNow()), 60_000);
    return () => clearInterval(t);
  }, [date]);
  return (
    <time dateTime={date} title={dayjs(date).format("YYYY-MM-DD HH:mm")} className="comment-time">
      {label}
    </time>
  );
}

// ── 头像 ──────────────────────────────────────────────
function Avatar({ nickname, avatar, size = 32 }: { nickname: string; avatar: string | null; size?: number }) {
  if (avatar) {
    return <img src={avatar} alt={nickname} className="comment-avatar" style={{ width: size, height: size }} />;
  }
  const char = (nickname || "?")[0].toUpperCase();
  const colors = ["#f43f5e", "#ec4899", "#a855f7", "#6366f1", "#0ea5e9", "#10b981"];
  const bg = colors[char.charCodeAt(0) % colors.length];
  return (
    <div className="comment-avatar comment-avatar--text" style={{ width: size, height: size, background: bg }}>
      {char}
    </div>
  );
}

// ── 回复行（扁平两层，抖音风格）──────────────────────────
function ReplyRow({
  reply,
  currentUserId,
  onReply,
  onLike,
  onDelete,
}: {
  reply: CommentItem;
  currentUserId: number | null;
  onReply: (c: CommentItem) => void;
  onLike: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const replyTarget = reply.reply_to_nickname || reply.reply_to_username;
  return (
    <div className="comment-row comment-row--reply">
      <Avatar nickname={reply.nickname || reply.username} avatar={reply.avatar} size={26} />
      <div className="comment-body">
        <div className="comment-meta">
          <span className="comment-author">{reply.nickname || reply.username}</span>
          {replyTarget && <span className="comment-reply-target">回复 @{replyTarget}</span>}
          <RelativeTime date={reply.created_at} />
        </div>
        <p className="comment-content">{reply.content}</p>
        <div className="comment-actions">
          <button
            className={`comment-action-btn ${reply.is_liked ? "liked" : ""}`}
            onClick={() => onLike(reply.id)}
            disabled={currentUserId === null}
          >
            <Heart size={11} fill={reply.is_liked ? "currentColor" : "none"} strokeWidth={1.8} />
            {reply.like_count > 0 && <span>{reply.like_count}</span>}
          </button>
          {currentUserId !== null && (
            <button className="comment-action-btn" onClick={() => onReply(reply)}>
              回复
            </button>
          )}
          {currentUserId === reply.user_id && (
            <button className="comment-action-btn comment-action-btn--danger" onClick={() => onDelete(reply.id)}>
              <Trash2 size={10} strokeWidth={1.8} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 根评论行 ──────────────────────────────────────────
function CommentRow({
  comment,
  currentUserId,
  onReply,
  onLike,
  onDelete,
}: {
  comment: CommentItem;
  currentUserId: number | null;
  onReply: (comment: CommentItem) => void;
  onLike: (commentId: number) => void;
  onDelete: (commentId: number) => void;
}) {
  return (
    <div className="comment-row">
      <Avatar nickname={comment.nickname || comment.username} avatar={comment.avatar} />
      <div className="comment-body">
        <div className="comment-meta">
          <span className="comment-author">{comment.nickname || comment.username}</span>
          <RelativeTime date={comment.created_at} />
        </div>
        <p className="comment-content">{comment.content}</p>
        <div className="comment-actions">
          <button
            className={`comment-action-btn ${comment.is_liked ? "liked" : ""}`}
            onClick={() => onLike(comment.id)}
            disabled={currentUserId === null}
            title={currentUserId === null ? "登录后才能点赞" : undefined}
          >
            <Heart size={12} fill={comment.is_liked ? "currentColor" : "none"} strokeWidth={1.8} />
            {comment.like_count > 0 && <span>{comment.like_count}</span>}
          </button>
          {currentUserId !== null && (
            <button className="comment-action-btn" onClick={() => onReply(comment)}>
              回复
            </button>
          )}
          {currentUserId === comment.user_id && (
            <button className="comment-action-btn comment-action-btn--danger" onClick={() => onDelete(comment.id)}>
              <Trash2 size={11} strokeWidth={1.8} />
            </button>
          )}
        </div>

        {/* 回复列表（扁平一层）*/}
        {comment.replies && comment.replies.length > 0 && (
          <div className="comment-replies">
            {comment.replies.map(reply => (
              <ReplyRow
                key={reply.id}
                reply={reply}
                currentUserId={currentUserId}
                onReply={onReply}
                onLike={onLike}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── 主面板 ────────────────────────────────────────────
export default function CommentPanel({ postId, postTitle, onClose, onCountChange }: Props) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<CommentItem | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // 读取当前用户
  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") ?? "{}");
      if (u?.id) setCurrentUserId(u.id);
    } catch { /* not logged in */ }
  }, []);

  // 组装两层树（所有回复归到根评论下）
  function buildTree(flat: CommentItem[]): CommentItem[] {
    const roots: CommentItem[] = [];
    const rootMap = new Map<number, CommentItem>();
    flat.forEach(c => {
      if (!c.parent_id) {
        const node = { ...c, replies: [] };
        roots.push(node);
        rootMap.set(c.id, node);
      }
    });
    flat.forEach(c => {
      if (c.parent_id) {
        const root = rootMap.get(c.parent_id);
        if (root) root.replies!.push({ ...c, replies: [] });
        // parent_id 找不到（已被删除等）则跳过
      }
    });
    return roots;
  }

  const fetchComments = useCallback(async (pg: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/comments?post_id=${postId}&page=${pg}&limit=50`);
      const json = await res.json();
      if (json.code === 0) {
        const tree = buildTree(json.data.list);
        setComments(pg === 1 ? tree : prev => [...prev, ...tree]);
        setTotalPages(json.data.pagination.pages);
        setTotal(json.data.pagination.total);
      }
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => { fetchComments(1); }, [fetchComments]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    try {
      // 确定 parent_id（回复时取根评论 id）
      // replyTo.parent_id 不为 null 说明 replyTo 本身是回复，其 parent_id 就是根
      const parentId = replyTo
        ? (replyTo.parent_id ?? replyTo.id)
        : null;
      const replyToUserId = replyTo ? replyTo.user_id : null;

      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post_id: postId,
          content: text.trim(),
          parent_id: parentId,
          reply_to_user_id: replyToUserId,
        }),
      });
      const text2 = await res.text();
      if (!text2) { alert("服务器错误，请确认数据库表已初始化"); return; }
      const json = JSON.parse(text2);
      if (json.code === 0) {
        const newComment: CommentItem = { ...json.data, replies: [] };
        setComments(prev => {
          if (!newComment.parent_id) return [newComment, ...prev];
          return prev.map(c => {
            if (c.id === newComment.parent_id) return { ...c, replies: [...(c.replies ?? []), newComment] };
            return c;
          });
        });
        setTotal(t => t + 1);
        onCountChange?.(1);
        setText("");
        setReplyTo(null);
      } else {
        alert(json.message ?? "发送失败");
      }
    } catch (err) {
      console.error(err);
      alert("网络错误，请稍后再试");
    } finally {
      setSubmitting(false);
    }
  }

  function handleReply(comment: CommentItem) {
    setReplyTo(comment);
    inputRef.current?.focus();
  }

  async function handleLike(commentId: number) {
    if (currentUserId === null) return;
    // 先记录原始状态用于回滚
    const snapshot = comments;
    // 乐观更新
    const update = (list: CommentItem[]): CommentItem[] =>
      list.map(c => {
        if (c.id === commentId) {
          return { ...c, is_liked: !c.is_liked, like_count: c.is_liked ? c.like_count - 1 : c.like_count + 1 };
        }
        return { ...c, replies: c.replies ? update(c.replies) : c.replies };
      });
    setComments(prev => update(prev));

    try {
      const res = await fetch(`/api/comments/${commentId}/like`, { method: "POST" });
      const text = await res.text();
      if (!text) throw new Error("empty response");
      const json = JSON.parse(text);
      if (json.code === 0) {
        setComments(prev => prev.map(c => {
          const fix = (list: CommentItem[]): CommentItem[] =>
            list.map(item => {
              if (item.id === commentId) return { ...item, like_count: json.data.like_count, is_liked: json.data.liked };
              return { ...item, replies: item.replies ? fix(item.replies) : item.replies };
            });
          return fix([c])[0];
        }));
      } else {
        // 失败回滚
        setComments(snapshot);
        if (json.code === 40100) alert("请先登录");
      }
    } catch {
      setComments(snapshot);
    }
  }

  async function handleDelete(commentId: number) {
    if (!confirm("确定删除这条评论吗？")) return;
    const res = await fetch(`/api/comments/${commentId}`, { method: "DELETE" });
    const json = await res.json();
    if (json.code === 0) {
      const remove = (list: CommentItem[]): CommentItem[] =>
        list
          .filter(c => c.id !== commentId)
          .map(c => ({ ...c, replies: c.replies ? remove(c.replies) : c.replies }));
      setComments(prev => remove(prev));
      setTotal(t => Math.max(0, t - 1));
      onCountChange?.(-1);
    }
  }

  // 关闭面板时点击背景
  function handleBackdropClick(e: React.MouseEvent) {
    if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
  }

  return createPortal(
    <div className="comment-backdrop" onClick={handleBackdropClick}>
      <div className="comment-panel" ref={panelRef}>
        {/* 头部 */}
        <div className="comment-panel-header">
          <div className="comment-panel-title">
            <MessageSquare size={15} strokeWidth={1.8} />
            <span>评论</span>
            {total > 0 && <span className="comment-panel-count">{total}</span>}
          </div>
          <div className="comment-panel-subtitle">{postTitle}</div>
          <button className="comment-panel-close" onClick={onClose}><X size={16} /></button>
        </div>

        {/* 评论列表 */}
        <div className="comment-list">
          {loading && page === 1 ? (
            <div className="comment-loading">
              <Loader2 size={20} className="admin-upload-spin" style={{ opacity: 0.4 }} />
            </div>
          ) : comments.length === 0 ? (
            <div className="comment-empty">
              <MessageSquare size={32} style={{ opacity: 0.2, display: "block", margin: "0 auto 8px" }} />
              <p>还没有评论，来说第一句吧~</p>
            </div>
          ) : (
            comments.map(c => (
              <CommentRow
                key={c.id}
                comment={c}
                currentUserId={currentUserId}
                onReply={handleReply}
                onLike={handleLike}
                onDelete={handleDelete}
              />
            ))
          )}

          {/* 加载更多 */}
          {page < totalPages && (
            <button
              className="comment-load-more"
              disabled={loading}
              onClick={() => { const np = page + 1; setPage(np); fetchComments(np); }}
            >
              {loading ? <Loader2 size={13} className="admin-upload-spin" /> : "加载更多"}
            </button>
          )}
        </div>

        {/* 输入区 */}
        <div className="comment-input-area">
          {replyTo && (
            <div className="comment-reply-hint">
              <span>回复 <strong>{replyTo.nickname || replyTo.username}</strong></span>
              <button onClick={() => setReplyTo(null)}><X size={11} /></button>
            </div>
          )}
          {currentUserId === null ? (
            <div className="comment-login-hint">
              <a href="/login">登录</a> 后才能发表评论
            </div>
          ) : (
            <form className="comment-form" onSubmit={handleSubmit}>
              <textarea
                ref={inputRef}
                className="comment-textarea"
                placeholder={replyTo ? `回复 @${replyTo.nickname || replyTo.username}…` : "说点什么吧…"}
                value={text}
                onChange={e => setText(e.target.value)}
                rows={2}
                maxLength={2000}
                onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit(e as unknown as React.FormEvent); }}
              />
              <div className="comment-form-footer">
                <span className="comment-char-count">{text.length}/2000</span>
                <button type="submit" className="comment-submit-btn" disabled={!text.trim() || submitting}>
                  {submitting ? <Loader2 size={13} className="admin-upload-spin" /> : <Send size={13} />}
                  {submitting ? "发送中…" : "发送"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
