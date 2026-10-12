import { groups, isGroupId, type GroupId } from "../data/questions";

const STORAGE_KEY = "quan-sat-meo-3d:v1";

export type Note = { id: string; groupId: GroupId; text: string };
export type Work = {
  version: 1;
  notes: Note[];
  drafts: Record<GroupId, string>;
  outline: { text: string; edited: boolean; generatedFrom: string } | null;
};

export const emptyDrafts = (): Record<GroupId, string> =>
  Object.fromEntries(groups.map((group) => [group.id, ""])) as Record<
    GroupId,
    string
  >;

export const emptyWork = (): Work => ({
  version: 1,
  notes: [],
  drafts: emptyDrafts(),
  outline: null,
});

export function loadWork(): { work: Work; error: string | null } {
  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return {
      work: emptyWork(),
      error:
        "Không thể đọc bài đã lưu trên trình duyệt này. Hãy sao chép dàn ý trước khi đóng trang.",
    };
  }
  try {
    if (!raw) return { work: emptyWork(), error: null };
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") throw new Error("Invalid data");
    const data = value as Record<string, unknown>;
    if (
      data.version !== 1 ||
      !Array.isArray(data.notes) ||
      !data.drafts ||
      typeof data.drafts !== "object"
    )
      throw new Error("Invalid schema");
    const notes: Note[] = [];
    for (const item of data.notes) {
      if (!item || typeof item !== "object") throw new Error("Invalid note");
      const note = item as Record<string, unknown>;
      if (
        typeof note.id !== "string" ||
        !note.id ||
        !isGroupId(note.groupId) ||
        typeof note.text !== "string"
      )
        throw new Error("Invalid note");
      notes.push({ id: note.id, groupId: note.groupId, text: note.text });
    }
    const drafts = emptyDrafts();
    for (const group of groups) {
      const draft = (data.drafts as Record<string, unknown>)[group.id];
      if (typeof draft !== "string") throw new Error("Invalid draft");
      drafts[group.id] = draft;
    }
    let outline: Work["outline"] = null;
    if (data.outline !== null && data.outline !== undefined) {
      if (typeof data.outline !== "object") throw new Error("Invalid outline");
      const item = data.outline as Record<string, unknown>;
      if (
        typeof item.text !== "string" ||
        typeof item.edited !== "boolean" ||
        typeof item.generatedFrom !== "string"
      )
        throw new Error("Invalid outline");
      outline = {
        text: item.text,
        edited: item.edited,
        generatedFrom: item.generatedFrom,
      };
    }
    return { work: { version: 1, notes, drafts, outline }, error: null };
  } catch {
    return {
      work: emptyWork(),
      error:
        "Bài đã lưu không đọc được. Em có thể bắt đầu bài mới trên trình duyệt này.",
    };
  }
}

export function saveWork(work: Work): string | null {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(work));
    return null;
  } catch {
    return "Không thể lưu trên trình duyệt này. Hãy sao chép dàn ý trước khi đóng trang.";
  }
}

export function clearWork(): string | null {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  } catch {
    return "Không thể xóa bài đã lưu trên trình duyệt này.";
  }
}
