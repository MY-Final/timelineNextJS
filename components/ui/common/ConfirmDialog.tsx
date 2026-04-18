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
  // 监听键盘：ESC 取消，Enter 确认，弹窗关闭时自动解绑
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter") onConfirm();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel, onConfirm]);

  // danger=true 时用垃圾桶图标，否则用信息图标
  const Icon = danger ? Trash2 : Info;

  // 使用 createPortal 渲染到 body，避免被父级 overflow/z-index 截断
  return createPortal(
    <>
      {/* 半透明遮罩，点击可取消 */}
      <div className="cdialog-backdrop" onClick={onCancel} />

      {/* 弹窗主体，role=alertdialog 保证无障碍可访问性 */}
      <div className="cdialog-panel" role="alertdialog" aria-modal="true" aria-labelledby="cdialog-title">
        {/* 顶部图标区域，data-danger 控制配色（红/蓝） */}
        <div className="cdialog-icon-wrap" data-danger={danger}>
          <Icon size={20} strokeWidth={1.8} />
        </div>

        {/* 标题 */}
        <h3 className="cdialog-title" id="cdialog-title">{title}</h3>

        {/* 可选的正文说明 */}
        {message && <p className="cdialog-message">{message}</p>}

        {/* 操作按钮区：取消（autoFocus 默认聚焦）+ 确认 */}
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
