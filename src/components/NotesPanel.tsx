import { useState } from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { groups } from "../data/questions";
import type { Note } from "../utils/storage";

type Props = {
  notes: Note[];
  onEdit: (id: string, text: string) => void;
  onDelete: (id: string) => void;
};

export function NotesPanel({ notes, onEdit, onDelete }: Props) {
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(
    null,
  );
  const groupsWithNotes = groups.filter((group) =>
    notes.some((note) => note.groupId === group.id),
  );
  return (
    <section className="notes-card" aria-labelledby="notes-heading">
      <div className="card-heading">
        <div>
          <span className="eyebrow">NHỮNG ĐIỀU EM GHI LẠI</span>
          <h2 id="notes-heading">Sổ ý quan sát</h2>
        </div>
        <span className="count-pill">{notes.length} ý</span>
      </div>
      {notes.length === 0 ? (
        <div className="empty-notes">
          Chưa có ý nào. Chọn một nhóm ở trên rồi viết điều em quan sát được
          nhé.
        </div>
      ) : (
        <div className="note-groups">
          {groupsWithNotes.map((group) => (
            <div className="note-group" key={group.id}>
              <h3>
                {group.label}
                <span>
                  {notes.filter((note) => note.groupId === group.id).length}
                </span>
              </h3>
              <ul>
                {notes
                  .filter((note) => note.groupId === group.id)
                  .map((note) => (
                    <li key={note.id} className="note-item">
                      {editing?.id === note.id ? (
                        <form
                          className="edit-note"
                          onSubmit={(event) => {
                            event.preventDefault();
                            if (editing.text.trim()) {
                              onEdit(note.id, editing.text);
                              setEditing(null);
                            }
                          }}
                        >
                          <input
                            aria-label={`Sửa ý trong nhóm ${group.label}`}
                            value={editing.text}
                            onChange={(event) =>
                              setEditing({
                                id: note.id,
                                text: event.target.value,
                              })
                            }
                            autoFocus
                          />
                          <button
                            type="submit"
                            title="Lưu sửa"
                            aria-label="Lưu sửa"
                            disabled={!editing.text.trim()}
                          >
                            <Check size={17} />
                          </button>
                          <button
                            type="button"
                            title="Hủy sửa"
                            aria-label="Hủy sửa"
                            onClick={() => setEditing(null)}
                          >
                            <X size={17} />
                          </button>
                        </form>
                      ) : (
                        <>
                          <span className="note-text">{note.text}</span>
                          <div className="note-actions">
                            <button
                              type="button"
                              aria-label={`Sửa ý: ${note.text}`}
                              title="Sửa ý"
                              onClick={() =>
                                setEditing({ id: note.id, text: note.text })
                              }
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              type="button"
                              aria-label={`Xóa ý: ${note.text}`}
                              title="Xóa ý"
                              onClick={() => onDelete(note.id)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </>
                      )}
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
