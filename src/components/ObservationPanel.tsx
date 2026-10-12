import { ArrowRight, Lightbulb, Plus } from "lucide-react";
import { groups, type GroupId } from "../data/questions";

type Props = {
  selectedGroup: GroupId;
  drafts: Record<GroupId, string>;
  counts: Record<GroupId, number>;
  onGroupChange: (group: GroupId) => void;
  onDraftChange: (value: string) => void;
  onAdd: () => void;
};

export function ObservationPanel({
  selectedGroup,
  drafts,
  counts,
  onGroupChange,
  onDraftChange,
  onAdd,
}: Props) {
  const group = groups.find((item) => item.id === selectedGroup)!;
  return (
    <section className="observation-card" aria-labelledby="observation-heading">
      <div className="card-heading">
        <div>
          <span className="eyebrow">BƯỚC 02 · GHI Ý</span>
          <h2 id="observation-heading">Em nhìn thấy gì?</h2>
        </div>
        <span className="count-pill">{counts[selectedGroup]} ý</span>
      </div>
      <div className="group-tabs" aria-label="Nhóm quan sát">
        {groups.map((item) => (
          <button
            key={item.id}
            type="button"
            className={selectedGroup === item.id ? "is-active" : ""}
            aria-pressed={selectedGroup === item.id}
            onClick={() => onGroupChange(item.id)}
          >
            {item.shortLabel}
            {counts[item.id] > 0 && (
              <span
                className="tab-dot"
                aria-label={`Đã có ${counts[item.id]} ý`}
              />
            )}
          </button>
        ))}
      </div>
      <div className="question-box">
        <div className="question-title">
          <Lightbulb size={18} />
          <span>Gợi ý quan sát · {group.label}</span>
        </div>
        <ul>
          {group.questions.map((question) => (
            <li key={question}>{question}</li>
          ))}
        </ul>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onAdd();
        }}
      >
        <label className="field-label" htmlFor="note-draft">
          Em quan sát được…
        </label>
        <textarea
          id="note-draft"
          rows={4}
          value={drafts[selectedGroup]}
          onChange={(event) => onDraftChange(event.target.value)}
          placeholder="Viết ý bằng lời của em ở đây…"
        />
        <div className="form-footer">
          <span>Mỗi lần lưu là một ý. Em có thể thêm nhiều ý.</span>
          <button className="primary-button" type="submit">
            <Plus size={18} /> Lưu ý
          </button>
        </div>
      </form>
      <div className="observation-bottom">
        <ArrowRight size={16} />
        <span>
          Đổi nhóm để tiếp tục quan sát. Bản nháp của em sẽ được giữ lại.
        </span>
      </div>
    </section>
  );
}
