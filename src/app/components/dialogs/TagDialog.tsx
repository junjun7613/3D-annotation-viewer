'use client';

import React, { useState, useEffect, useMemo } from 'react';
import DialogWrapper from './DialogWrapper';

export interface TagFormData {
  key: string;
  /** 同一 key に対して複数の値を一度に付与できる */
  values: string[];
  addedComment: string;
}

interface TagDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: TagFormData) => void;
  /** 既知の分類軸一覧（サジェスト用） */
  knownKeys: string[];
  /** 指定 key に紐づく既知の値を返す（サジェスト用） */
  valuesFor: (key: string) => string[];
  /** 当該アノテーションに既に付与済みの値（key ごと）。重複追加を抑止する */
  existingValuesFor?: (key: string) => string[];
  initialKey?: string;
  initialValues?: string[];
  initialAddedComment?: string;
}

/**
 * 値の区切り文字。日本語入力では全角カンマ「，」や読点「、」がそのまま入力されるため、
 * 半角カンマだけでなく全角の類も区切りとして受け付ける。
 */
const VALUE_SEPARATORS = /[,，、､]/;

/** 区切り文字で分割し、空要素を除いた配列を返す */
function splitValues(raw: string): string[] {
  return raw
    .split(VALUE_SEPARATORS)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** 入力中の文字列に対する候補を絞り込む（前方一致 → 部分一致の順、除外済みは省く） */
function filterSuggestions(candidates: string[], input: string, exclude: string[]): string[] {
  const q = input.trim().toLowerCase();
  const excludeSet = new Set(exclude.map((e) => e.toLowerCase()));
  const pool = candidates.filter((c) => !excludeSet.has(c.toLowerCase()));
  if (!q) return pool.slice(0, 8);
  const prefix: string[] = [];
  const partial: string[] = [];
  pool.forEach((c) => {
    const lower = c.toLowerCase();
    if (lower === q) return;
    if (lower.startsWith(q)) prefix.push(c);
    else if (lower.includes(q)) partial.push(c);
  });
  return [...prefix, ...partial].slice(0, 8);
}

const TagDialog: React.FC<TagDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  knownKeys,
  valuesFor,
  existingValuesFor,
  initialKey = '',
  initialValues = [],
  initialAddedComment = '',
}) => {
  const [key, setKey] = useState(initialKey);
  // 確定済みの値（チップ）と、入力途中の文字列を分けて持つ
  const [values, setValues] = useState<string[]>(initialValues);
  const [valueInput, setValueInput] = useState('');
  const [addedComment, setAddedComment] = useState(initialAddedComment);

  useEffect(() => {
    if (isOpen) {
      setKey(initialKey);
      setValues(initialValues);
      setValueInput('');
      setAddedComment(initialAddedComment);
    }
    // initialValues は配列リテラルで渡されうるため依存に入れない（開いた時点の値で初期化する）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialKey, initialAddedComment]);

  // key を変えると、それまでの値は別の軸のものなので破棄する
  const handleKeyChange = (next: string) => {
    setKey(next);
    setValues([]);
    setValueInput('');
  };

  /**
   * 分割案。入力に区切り文字が含まれるときだけ提示する。
   * 入力中に自動で分割してしまうと、意図せず値が割れても気づけないため、
   * 一度ユーザーに見せて確認を取ってから確定する（researchmap の著者登録と同じ流れ）。
   */
  const splitPreview = useMemo(() => {
    if (!VALUE_SEPARATORS.test(valueInput)) return null;
    const parts = splitValues(valueInput);
    if (parts.length === 0) return null;
    const already = existingValuesFor ? existingValuesFor(key) : [];
    return parts.map((v) => ({
      value: v,
      duplicate:
        values.some((x) => x.toLowerCase() === v.toLowerCase()) ||
        already.some((x) => x.toLowerCase() === v.toLowerCase()),
    }));
  }, [valueInput, values, existingValuesFor, key]);

  /** 追加対象（分割案のうち重複していないもの） */
  const splitAddable = useMemo(
    () => (splitPreview ?? []).filter((p) => !p.duplicate).map((p) => p.value),
    [splitPreview]
  );

  /** 分割案を承認してチップに確定する */
  const applySplit = () => {
    if (splitAddable.length === 0) return;
    setValues((prev) => {
      const next = [...prev];
      splitAddable.forEach((v) => {
        if (!next.some((x) => x.toLowerCase() === v.toLowerCase())) next.push(v);
      });
      return next;
    });
    setValueInput('');
  };

  /** 分割せず、入力文字列をそのまま 1 つの値として確定する */
  const applyAsSingle = () => {
    const v = valueInput.trim();
    if (!v) return;
    setValues((prev) =>
      prev.some((x) => x.toLowerCase() === v.toLowerCase()) ? prev : [...prev, v]
    );
    setValueInput('');
  };

  /** 区切り文字を含まない単一値の確定（Enter / 追加ボタン / 候補クリック） */
  const addValue = (raw: string) => {
    const v = raw.trim();
    if (!v) return;
    setValues((prev) =>
      prev.some((x) => x.toLowerCase() === v.toLowerCase()) ? prev : [...prev, v]
    );
    setValueInput('');
  };

  const removeValue = (index: number) => {
    setValues((prev) => prev.filter((_, i) => i !== index));
  };

  const keySuggestions = useMemo(
    () => filterSuggestions(knownKeys, key, []),
    [knownKeys, key]
  );

  // 語彙の候補から、この場で追加済みの値と既にアノテーションに付いている値を除く
  const valueSuggestions = useMemo(() => {
    const already = existingValuesFor ? existingValuesFor(key) : [];
    return filterSuggestions(valuesFor(key), valueInput, [...values, ...already]);
  }, [valuesFor, existingValuesFor, key, valueInput, values]);

  // 分割案が出ている間は、未確定の入力を保存対象に含めない（確認を促すため）
  const pendingValues = useMemo(() => {
    if (splitPreview) return values;
    const v = valueInput.trim();
    if (!v) return values;
    if (values.some((x) => x.toLowerCase() === v.toLowerCase())) return values;
    return [...values, v];
  }, [values, valueInput, splitPreview]);

  const canSave = key.trim() !== '' && pendingValues.length > 0 && !splitPreview;

  const handleSave = () => {
    if (!canSave) return;
    onSave({ key: key.trim(), values: pendingValues, addedComment });
  };

  return (
    <DialogWrapper isOpen={isOpen} onClose={onClose} title="タグを追加">
      <form className="flex flex-col gap-4">
        <p className="text-xs text-[var(--text-secondary)] -mb-1">
          分類軸（key）と値（value）の組でアノテーションを分類します。例: 身分 : 武士
        </p>

        {/* 分類軸（key） */}
        <div>
          <label className="font-bold text-lg">
            分類軸（Key）:
            <input
              value={key}
              onChange={(e) => handleKeyChange(e.target.value)}
              placeholder="例: 身分"
              className="input-field"
            />
          </label>
          {keySuggestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {keySuggestions.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => handleKeyChange(k)}
                  className="px-2 py-0.5 text-xs rounded-full border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--secondary-bg)] transition-colors"
                >
                  {k}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 値（value）— 複数可 */}
        <div>
          <p className="font-bold text-lg mb-1">
            値（Value）:
            <span className="text-sm font-normal text-[var(--text-secondary)] ml-2">
              （複数可）カンマ「,」「，」・読点「、」で区切ると分割案を提示します。「追加」で確定
            </span>
          </p>

          {/* 確定済みの値 */}
          {values.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {values.map((v, i) => (
                <span
                  key={`${v}-${i}`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-[var(--secondary-bg)] border border-[var(--border)]"
                >
                  <span className="font-medium text-[var(--text-primary)]">{v}</span>
                  <button
                    type="button"
                    onClick={() => removeValue(i)}
                    className="text-[var(--text-secondary)] hover:text-red-500 transition-colors"
                    title="この値を外す"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              value={valueInput}
              onChange={(e) => setValueInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  // Enter では保存も分割承認も行わない。
                  // IME の変換確定で Enter が飛ぶため、意図しない登録・確定を防ぐ。
                  // 値の確定は「追加」ボタン、分割は「分割して追加」ボタンに限定する。
                  e.preventDefault();
                } else if (e.key === 'Backspace' && !valueInput && values.length > 0) {
                  // 空入力での Backspace は直前のチップを削除
                  removeValue(values.length - 1);
                }
              }}
              placeholder="例: 武士"
              className="input-field mb-0 flex-1"
            />
            <button
              type="button"
              onClick={() => addValue(valueInput)}
              disabled={!valueInput.trim() || !!splitPreview}
              className="px-3 py-1.5 text-sm font-medium rounded-md bg-[var(--primary)] text-white disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex-shrink-0"
            >
              追加
            </button>
          </div>

          {/* 分割案の確認 */}
          {splitPreview && (
            <div className="mt-2 p-3 rounded-lg border border-[var(--primary)] bg-blue-50 dark:bg-blue-900/20">
              <p className="text-sm font-semibold text-[var(--text-primary)] mb-2">
                分割案（{splitPreview.length} 件）
                <span className="text-xs font-normal text-[var(--text-secondary)] ml-2">
                  この内容でよければ「分割して追加」を押してください
                </span>
              </p>
              <ol className="flex flex-col gap-1 mb-2.5 list-none p-0 m-0">
                {splitPreview.map((p, i) => (
                  <li key={`${p.value}-${i}`} className="flex items-center gap-2 text-sm">
                    <span className="text-xs text-[var(--text-secondary)] w-5 flex-shrink-0 text-right">
                      {i + 1}.
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs border ${
                        p.duplicate
                          ? 'border-[var(--border)] text-[var(--text-secondary)] line-through opacity-60'
                          : 'border-[var(--border)] bg-[var(--card-bg)] text-[var(--text-primary)] font-medium'
                      }`}
                    >
                      {p.value}
                    </span>
                    {p.duplicate && (
                      <span className="text-xs text-[var(--text-secondary)]">既に追加済み（スキップ）</span>
                    )}
                  </li>
                ))}
              </ol>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={applySplit}
                  disabled={splitAddable.length === 0}
                  className="px-3 py-1.5 text-sm font-medium rounded-md bg-[var(--primary)] text-white disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                >
                  分割して追加（{splitAddable.length} 件）
                </button>
                <button
                  type="button"
                  onClick={applyAsSingle}
                  className="px-3 py-1.5 text-sm font-medium rounded-md border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--secondary-bg)] transition-colors"
                >
                  分割せず 1 件として追加
                </button>
              </div>
            </div>
          )}

          {!splitPreview && valueSuggestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {valueSuggestions.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => addValue(v)}
                  className="px-2 py-0.5 text-xs rounded-full border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--secondary-bg)] transition-colors"
                >
                  {v}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 付与者コメント */}
        <label className="font-bold text-lg">
          Comment:
          <span className="text-sm font-normal text-[var(--text-secondary)] ml-2">（任意）このタグを付ける理由・根拠</span>
          <input
            value={addedComment}
            onChange={(e) => setAddedComment(e.target.value)}
            placeholder="例: 帯刀と髷の形状から判断"
            className="input-field"
          />
        </label>
        {pendingValues.length > 1 && addedComment && (
          <p className="text-xs text-[var(--text-secondary)] -mt-2">
            コメントは {pendingValues.length} 件すべての値に同じ内容で記録されます。
          </p>
        )}

        <div className="flex justify-end items-center gap-3">
          {splitPreview && (
            <span className="text-xs text-[var(--text-secondary)] mr-auto">
              分割案を確定してから保存してください
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="btn-info disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save{pendingValues.length > 1 ? `（${pendingValues.length}件）` : ''}
          </button>
          <button type="button" onClick={onClose} className="btn-primary">Close</button>
        </div>
      </form>
    </DialogWrapper>
  );
};

export default TagDialog;
