import { groups, partIds } from "../data/questions";
import type { Note, Work } from "./storage";

export const notesSignature = (notes: Note[]) => JSON.stringify(notes);

export const missingObservationParts = (
  notes: Note[],
  drafts: Work["drafts"],
) =>
  partIds.filter(
    (part) =>
      !drafts[part].trim() &&
      !notes.some((note) => note.groupId === part && note.text.trim()),
  );

export function createOutline(notes: Note[]): {
  text: string;
  missing: string[];
} {
  const writtenNotes = notes.filter((note) => note.text.trim());
  const byGroup = (id: Note["groupId"]) =>
    writtenNotes
      .filter((note) => note.groupId === id)
      .map((note) => `  • ${note.text.trim()}`);
  const missing = groups
    .filter((group) => !writtenNotes.some((note) => note.groupId === group.id))
    .map((group) => group.shortLabel);
  const body = groups
    .filter(
      (group) =>
        ["overall", "eyes", "ears", "legs", "tail"].includes(group.id) &&
        writtenNotes.some((note) => note.groupId === group.id),
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
