import { Check, Sparkles } from "lucide-react";
import { groupLabel, partIds, type PartId } from "../data/questions";

type Props = {
  missingParts: PartId[];
  onPartSelect: (part: PartId) => void;
  onGenerate: () => void;
};

export function OutlineReadyPanel({
  missingParts,
  onPartSelect,
  onGenerate,
}: Props) {
  const completedCount = partIds.length - missingParts.length;
  const ready = missingParts.length === 0;

  return (
    <section className="outline-ready" aria-labelledby="outline-ready-heading">
      <span className="eyebrow">BƯỚC 03 · TẠO DÀN Ý</span>
      <div className="outline-ready-heading">
        <h2 id="outline-ready-heading">Sẵn sàng tạo dàn ý?</h2>
        <span className="outline-ready-count">
          {completedCount}/{partIds.length} bộ phận
        </span>
      </div>
      <progress
        className="outline-ready-progress"
        value={completedCount}
        max={partIds.length}
        aria-label="Số bộ phận đã có ý"
      >
        {completedCount}/{partIds.length}
      </progress>
      <div className="outline-ready-parts">
        {partIds.map((part) => {
          const complete = !missingParts.includes(part);
          const status = complete ? "Đã có ý" : "Chưa có ý";
          return (
            <button
              key={part}
              type="button"
              className={`outline-ready-part${complete ? " is-complete" : ""}`}
              aria-label={`${groupLabel(part)}: ${status}`}
              onClick={() => onPartSelect(part)}
            >
              <span className="outline-ready-part-name">
                {complete && <Check size={14} aria-hidden="true" />}
                {groupLabel(part)}
              </span>
              <span className="outline-ready-part-status">{status}</span>
            </button>
          );
        })}
      </div>
      <p className="outline-ready-status" role="status">
        {ready
          ? "Em đã ghi ý cho tất cả bộ phận. Bấm nút bên dưới để tạo dàn ý."
          : `Hãy ghi ý cho: ${missingParts.map(groupLabel).join(", ")} để tạo dàn ý.`}
      </p>
      {ready && (
        <button type="button" className="generate-button" onClick={onGenerate}>
          <Sparkles size={18} aria-hidden="true" /> Tạo dàn ý
        </button>
      )}
    </section>
  );
}
