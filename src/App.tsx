import { useCallback, useEffect, useMemo, useState } from "react";
import { Cat, FileText, Menu, RotateCcw, X } from "lucide-react";
import { CatViewer } from "./components/CatViewer";
import { NotesPanel } from "./components/NotesPanel";
import { ObservationPanel } from "./components/ObservationPanel";
import { OutlinePanel } from "./components/OutlinePanel";
import { PartSelector } from "./components/PartSelector";
import { groups, isPartId, type GroupId, type PartId } from "./data/questions";
import { createOutline, notesSignature } from "./utils/outline";
import { clearWork, emptyWork, loadWork, saveWork } from "./utils/storage";

const makeId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function App() {
  const [initial] = useState(loadWork);
  const [work, setWork] = useState(initial.work);
  const [selectedGroup, setSelectedGroup] = useState<GroupId>("overall");
  const [storageNotice, setStorageNotice] = useState(initial.error);
  const [message, setMessage] = useState("");
  const [catReady, setCatReady] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const selectedPart = isPartId(selectedGroup) ? selectedGroup : null;
  const counts = useMemo(
    () =>
      Object.fromEntries(
        groups.map((group) => [
          group.id,
          work.notes.filter((note) => note.groupId === group.id).length,
        ]),
      ) as Record<GroupId, number>,
    [work.notes],
  );
  const { missing } = createOutline(work.notes);
  const notesChanged =
    !!work.outline && work.outline.generatedFrom !== notesSignature(work.notes);

  useEffect(() => {
    const error = saveWork(work);
    if (error) setStorageNotice(error);
  }, [work]);
  useEffect(() => {
    if (!outlineOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOutlineOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [outlineOpen]);

  const selectGroup = (groupId: GroupId) => {
    setSelectedGroup(groupId);
    setPanelOpen(true);
    setMessage("");
  };
  const selectPart = (partId: PartId) => selectGroup(partId);
  const addNote = () => {
    const text = work.drafts[selectedGroup];
    if (!text.trim()) {
      setMessage("Hãy viết một ý trước khi lưu.");
      return;
    }
    setWork((current) => ({
      ...current,
      notes: [...current.notes, { id: makeId(), groupId: selectedGroup, text }],
      drafts: { ...current.drafts, [selectedGroup]: "" },
    }));
    setMessage("Đã lưu ý của em.");
  };
  const generate = () => {
    if (work.notes.length === 0) {
      setMessage("Hãy ghi ít nhất một ý trước khi tạo dàn ý.");
      setPanelOpen(true);
      return false;
    }
    if (
      work.outline?.edited &&
      !window.confirm("Dàn ý đã được em chỉnh sửa. Tạo lại sẽ thay thế nội dung hiện tại. Em muốn tiếp tục?")
    ) return false;
    const result = createOutline(work.notes);
    setWork((current) => ({
      ...current,
      outline: {
        text: result.text,
        edited: false,
        generatedFrom: notesSignature(current.notes),
      },
    }));
    setMessage(
      result.missing.length
        ? `Đã tạo dàn ý. Em có thể bổ sung hoặc bỏ qua: ${result.missing.join(", ")}.`
        : "Đã tạo dàn ý từ các ý của em.",
    );
    return true;
  };
  const newWork = () => {
    if (!window.confirm("Xóa tất cả ý, bản nháp và dàn ý để làm bài mới?")) return;
    const error = clearWork();
    if (error) setStorageNotice(error);
    setWork(emptyWork());
    setSelectedGroup("overall");
    setMessage("Đã bắt đầu bài mới.");
  };
  const resetView = () => {
    setSelectedGroup("overall");
    setResetSignal((current) => current + 1);
  };
  const onCatReady = useCallback(() => setCatReady(true), []);

  return (
    <div className="immersive-app">
      <CatViewer
        panelOpen={panelOpen}
        selectedPart={selectedPart}
        onPartSelect={selectPart}
        onOverallSelect={() => selectGroup("overall")}
        onReady={onCatReady}
        resetSignal={resetSignal}
      />

      <header className="immersive-header">
        <h1><Cat size={22} /> Quan sát chú mèo</h1>
        <div className="immersive-actions">
          {catReady && (
            <button type="button" className="ghost" onClick={() => setPanelOpen((open) => !open)}>
              <Menu size={17} /> {panelOpen ? "Ẩn ghi ý" : "Ghi ý"}
            </button>
          )}
          <button type="button" className="ghost" onClick={resetView} disabled={!catReady}>
            <RotateCcw size={17} /> Về góc nhìn ban đầu
          </button>
          <button type="button" onClick={() => { if (generate()) setOutlineOpen(true); }} disabled={!catReady}>
            <FileText size={17} /> Tạo dàn ý
          </button>
        </div>
      </header>

      {catReady && panelOpen && (
        <aside className="study-panel" aria-label="Ghi ý quan sát">
          <div className="study-panel-heading">
            <div>
              <span className="eyebrow">TÌM Ý VIẾT VĂN</span>
              <h2>Em quan sát được gì?</h2>
            </div>
            <button type="button" aria-label="Đóng bảng ghi ý" onClick={() => setPanelOpen(false)}><X size={18} /></button>
          </div>
          {(storageNotice || message) && <p className="study-notice" role="status">{storageNotice ?? message}</p>}
          <p className="study-intro">Chọn bộ phận trên mèo hoặc bấm nút bên dưới để xem câu hỏi gợi ý.</p>
          <PartSelector selectedPart={selectedPart} onPartSelect={selectPart} />
          <ObservationPanel
            selectedGroup={selectedGroup}
            drafts={work.drafts}
            counts={counts}
            onGroupChange={selectGroup}
            onDraftChange={(value) =>
              setWork((current) => ({
                ...current,
                drafts: { ...current.drafts, [selectedGroup]: value },
              }))
            }
            onAdd={addNote}
          />
          <NotesPanel
            notes={work.notes}
            onEdit={(id, text) =>
              setWork((current) => ({
                ...current,
                notes: current.notes.map((note) => note.id === id ? { ...note, text } : note),
              }))
            }
            onDelete={(id) =>
              setWork((current) => ({
                ...current,
                notes: current.notes.filter((note) => note.id !== id),
              }))
            }
          />
          <div className="study-bottom">
            <span>Bài làm được lưu trên trình duyệt này.</span>
            <button type="button" onClick={newWork}>Làm bài mới</button>
          </div>
        </aside>
      )}

      {outlineOpen && (
        <div className="outline-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setOutlineOpen(false);
        }}>
          <div className="outline-dialog" role="dialog" aria-modal="true" aria-label="Dàn ý của em">
            <button type="button" className="dialog-close" aria-label="Đóng dàn ý" onClick={() => setOutlineOpen(false)}><X size={20} /></button>
            <OutlinePanel
              outline={work.outline}
              noteCount={work.notes.length}
              missing={missing}
              notesChanged={notesChanged}
              onGenerate={generate}
              onChange={(text) =>
                setWork((current) =>
                  current.outline
                    ? { ...current, outline: { ...current.outline, text, edited: true } }
                    : current,
                )
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
