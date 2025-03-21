import { useState } from 'react';
import dynamic from 'next/dynamic';

// 動態導入 react-markdown 以避免 SSR 問題
const ReactMarkdown = dynamic(() => import('react-markdown'), {
  ssr: false
});

export default function MarkdownEditor({ value, onChange, placeholder }) {
  const [isPreview, setIsPreview] = useState(false);
  
  return (
    <div className="markdown-editor">
      <div className="editor-toolbar">
        <button
          type="button"
          className={`editor-tab ${!isPreview ? 'active' : ''}`}
          onClick={() => setIsPreview(false)}
        >
          編輯
        </button>
        <button
          type="button"
          className={`editor-tab ${isPreview ? 'active' : ''}`}
          onClick={() => setIsPreview(true)}
        >
          預覽
        </button>
        <div className="editor-actions">
          <button
            type="button"
            className="editor-action"
            onClick={() => {
              const textarea = document.getElementById('markdown-textarea');
              const start = textarea.selectionStart;
              const end = textarea.selectionEnd;
              const text = textarea.value;
              const before = text.substring(0, start);
              const selection = text.substring(start, end);
              const after = text.substring(end);
              
              onChange(`${before}**${selection || '粗體文字'}**${after}`);
              
              // 設置光標位置
              setTimeout(() => {
                textarea.focus();
                if (!selection) {
                  textarea.setSelectionRange(start + 2, start + 6);
                } else {
                  textarea.setSelectionRange(start, end + 4);
                }
              }, 0);
            }}
            title="粗體"
          >
            <i className="ri-bold"></i>
          </button>
          <button
            type="button"
            className="editor-action"
            onClick={() => {
              const textarea = document.getElementById('markdown-textarea');
              const start = textarea.selectionStart;
              const end = textarea.selectionEnd;
              const text = textarea.value;
              const before = text.substring(0, start);
              const selection = text.substring(start, end);
              const after = text.substring(end);
              
              onChange(`${before}_${selection || '斜體文字'}_${after}`);
              
              setTimeout(() => {
                textarea.focus();
                if (!selection) {
                  textarea.setSelectionRange(start + 1, start + 5);
                } else {
                  textarea.setSelectionRange(start, end + 2);
                }
              }, 0);
            }}
            title="斜體"
          >
            <i className="ri-italic"></i>
          </button>
          <button
            type="button"
            className="editor-action"
            onClick={() => {
              const textarea = document.getElementById('markdown-textarea');
              const start = textarea.selectionStart;
              const text = textarea.value;
              const before = text.substring(0, start);
              const after = text.substring(start);
              
              onChange(`${before}\n## 標題\n${after}`);
              
              setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(start + 4, start + 6);
              }, 0);
            }}
            title="標題"
          >
            <i className="ri-heading"></i>
          </button>
          <button
            type="button"
            className="editor-action"
            onClick={() => {
              const textarea = document.getElementById('markdown-textarea');
              const start = textarea.selectionStart;
              const text = textarea.value;
              const before = text.substring(0, start);
              const after = text.substring(start);
              
              onChange(`${before}\n- 列表項目\n${after}`);
              
              setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(start + 3, start + 7);
              }, 0);
            }}
            title="列表"
          >
            <i className="ri-list-unordered"></i>
          </button>
          <button
            type="button"
            className="editor-action"
            onClick={() => {
              const textarea = document.getElementById('markdown-textarea');
              const start = textarea.selectionStart;
              const text = textarea.value;
              const before = text.substring(0, start);
              const after = text.substring(start);
              
              onChange(`${before}\n> 引用文字\n${after}`);
              
              setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(start + 3, start + 7);
              }, 0);
            }}
            title="引用"
          >
            <i className="ri-double-quotes-l"></i>
          </button>
          <button
            type="button"
            className="editor-action"
            onClick={() => {
              const textarea = document.getElementById('markdown-textarea');
              const start = textarea.selectionStart;
              const end = textarea.selectionEnd;
              const text = textarea.value;
              const before = text.substring(0, start);
              const selection = text.substring(start, end);
              const after = text.substring(end);
              
              onChange(`${before}[${selection || '連結文字'}](https://example.com)${after}`);
              
              setTimeout(() => {
                textarea.focus();
                if (!selection) {
                  textarea.setSelectionRange(start + 1, start + 5);
                } else {
                  textarea.setSelectionRange(start, end + 2);
                }
              }, 0);
            }}
            title="連結"
          >
            <i className="ri-link"></i>
          </button>
        </div>
      </div>
      
      <div className="editor-content">
        {isPreview ? (
          <div className="markdown-preview markdown-content">
            {value ? (
              <ReactMarkdown>{value}</ReactMarkdown>
            ) : (
              <div className="preview-placeholder">預覽將顯示在這裡</div>
            )}
          </div>
        ) : (
          <textarea
            id="markdown-textarea"
            className="markdown-textarea"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows="10"
          />
        )}
      </div>
    </div>
  );
} 