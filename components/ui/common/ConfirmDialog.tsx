"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Info, Trash2 } from "lucide-react";

export interface ConfirmDialogProps {
  /** 弹窗标题 */
  title: string;
  /** 正文说明（可选） */
  message?: string;
  /** 确认按钮文案，默认「确认」 */
  confirmText?: string;
  /** 取消按钮文案，默认「取消」 */
  cancelText?: string;
  /** 是否危险操作（红色确认按钮），默认 false */
  danger?: boolean;
  /** 点击确认 */
  onConfirm: () => void;
  /** 点击取消 / 关闭 */
  onCancel: () => void;
}

/**
 * 通用确认对话框
 *
 * 用法（示例）：
 * ```tsx
 * const [dialog, setDialog] = useState<ConfirmDialogProps | null>(null);
 *
 * // 触发删除确认
 * setDialog({
 *   title: "确认删除",
 *   message: "此操作不可撤销，确认删除该帖子？",
 *   confirmText: "删除",
 *   danger: true,
 *   onConfirm: () => { doDelete(); setDialog(null); },
 *   onCancel: () => setDialog(null),
 * });
 *
 * // 渲染
 * {dialog && <ConfirmDialog {...dialog} />}
 * ```
 */
export default function ConfirmDialog({
  title,
  message,
  confirmText = "确认",
  cancelText = "取消",
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  // ESC 取消
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter") onConfirm();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel, onConfirm]);

  const Icon = danger ? Trash2 : Info;

  return createPortal(
    <>
      <div className="cdialog-backdrop" onClick={onCancel} />
      <div className="cdialog-panel" role="alertdialog" aria-modal="true" aria-labelledby="cdialog-title">
        <div className="cdialog-icon-wrap" data-danger={danger}>
          <Icon size={20} strokeWidth={1.8} />
        </div>
        <h3 className="cdialog-title" id="cdialog-title">{title}</h3>
        {message && <p className="cdialog-message">{message}</p>}
        <div className="cdialog-actions">
          <button className="admin-action-btn cdialog-cancel" onClick={onCancel} autoFocus>
            {cancelText}
          </button>
          <button
            className={`admin-action-btn ${danger ? "admin-action-btn--danger" : "admin-action-btn--primary"} cdialog-confirm`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}
