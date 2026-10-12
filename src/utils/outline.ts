import { groups } from "../data/questions";
import type { Note } from "./storage";

export const notesSignature = (notes: Note[]) => JSON.stringify(notes);

export function createOutline(notes: Note[]): {
  text: string;
  missing: string[];
} {
  const byGroup = (id: Note["groupId"]) =>
    notes
      .filter((note) => note.groupId === id)
      .map((note) => `  • ${note.text}`);
  const missing = groups
    .filter((group) => !notes.some((note) => note.groupId === group.id))
    .map((group) => group.shortLabel);
  const body = groups
    .filter(
      (group) =>
        ["overall", "eyes", "ears", "legs", "tail"].includes(group.id) &&
        notes.some((note) => note.groupId === group.id),
    )
    .flatMap((group) => [`  ${group.shortLabel}`, ...byGroup(group.id)]);
  return {
    text: [
      ["MỞ BÀI", ...byGroup("intro")].join("\n"),
      ["THÂN BÀI", ...body].join("\n"),
      ["KẾT BÀI", ...byGroup("feelings")].join("\n"),
    ].join("\n\n"),
    missing,
  };
}
