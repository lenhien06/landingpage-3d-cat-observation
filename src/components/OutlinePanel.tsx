import { useRef, useState } from "react";
import { Check, ClipboardCopy, FileText, Sparkles } from "lucide-react";
import { groupLabel, partIds } from "../data/questions";
import type { Work } from "../utils/storage";

type Props = {
  outline: Work["outline"];
  missingParts: string[];
  missing: string[];
  notesChanged: boolean;
  onGenerate: () => void;
  onChange: (text: string) => void;
};

export function OutlinePanel({
  outline,
  missingParts,
  missing,
  notesChanged,
  onGenerate,
  onChange,
}: Props) {
  const optionalMissing = missing.filter(
    (label) => !partIds.some((part) => groupLabel(part) === label),
  );
  const textarea = useRef<HTMLTextAreaElement>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "manual">(
    "idle",
  );
  const copy = async () => {
    if (!outline) return;
    try {
      if (!navigator.clipboard?.writeText)
        throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(outline.text);
      setCopyState("copied");
    } catch {
      textarea.current?.focus();
      textarea.current?.select();
      setCopyState("manual");
    }
  };

  return (
    <section className="outline-card" aria-labelledby="outline-heading">
      <div className="card-heading">
        <div>
          <span className="eyebrow">BƯỚC 03 · SẮP XẾP Ý</span>
          <h2 id="outline-heading">Dàn ý của em</h2>
        </div>
        <FileText size={23} className="heading-icon" />
      </div>
      <p className="outline-intro">
        Các ý em đã viết sẽ được xếp theo thứ tự mở bài, thân bài và kết bài.
      </p>
      <button type="button" className="generate-button" onClick={onGenerate} disabled={missingParts.length > 0}>
        <Sparkles size={18} /> {outline ? "Tạo lại dàn ý" : "Tạo dàn ý"}
      </button>
      {missingParts.length > 0 && (
        <p className="inline-message">
          Hãy ghi ý cho các bộ phận còn thiếu trước khi tạo dàn ý: {missingParts.join(", ")}.
        </p>
      )}
      {outline && (
        <>
          {optionalMissing.length > 0 && (
            <p className="inline-message">
              Có thể bổ sung hoặc bỏ qua: {optionalMissing.join(", ")}.
            </p>
          )}
          {notesChanged && (
            <p className="inline-message">
              Sổ ý đã thay đổi. Bấm “Tạo lại dàn ý” nếu em muốn cập nhật.
            </p>
          )}
          <label className="field-label" htmlFor="outline-text">
            Em có thể chỉnh sửa dàn ý
          </label>
          <textarea
            id="outline-text"
            ref={textarea}
            className="outline-textarea"
            rows={15}
            value={outline.text}
            onChange={(event) => onChange(event.target.value)}
          />
          <button type="button" className="copy-button" onClick={copy}>
            {copyState === "copied" ? (
              <Check size={17} />
            ) : (
              <ClipboardCopy size={17} />
            )}
            {copyState === "copied" ? "Đã sao chép" : "Sao chép dàn ý"}
          </button>
          {copyState === "manual" && (
            <p className="inline-message" role="status">
              Đã chọn dàn ý. Nhấn Ctrl+C để sao chép.
            </p>
          )}
        </>
      )}
    </section>
  );
}
