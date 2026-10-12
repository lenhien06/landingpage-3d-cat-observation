export const groups = [
  {
    id: "intro",
    label: "Giới thiệu",
    shortLabel: "Giới thiệu",
    questions: [
      "Em muốn giới thiệu chú mèo nào?",
      "Em biết chú mèo ấy từ đâu?",
    ],
  },
  {
    id: "overall",
    label: "Quan sát toàn thể",
    shortLabel: "Toàn thể",
    questions: ["Mèo có dáng như thế nào?", "Bộ lông có màu gì?"],
  },
  {
    id: "eyes",
    label: "Mắt",
    shortLabel: "Mắt",
    questions: ["Đôi mắt có màu gì?", "Hình dạng như thế nào?"],
  },
  {
    id: "ears",
    label: "Tai",
    shortLabel: "Tai",
    questions: ["Tai có hình gì?", "Đang hướng về đâu?"],
  },
  {
    id: "legs",
    label: "Chân",
    shortLabel: "Chân",
    questions: ["Các chân trông như thế nào?", "Em thấy gì ở bàn chân?"],
  },
  {
    id: "tail",
    label: "Đuôi",
    shortLabel: "Đuôi",
    questions: ["Đuôi dài hay ngắn?", "Thẳng hay cong?"],
  },
  {
    id: "feelings",
    label: "Cảm nghĩ",
    shortLabel: "Cảm nghĩ",
    questions: ["Em có cảm nghĩ gì về chú mèo?"],
  },
] as const;

export type GroupId = (typeof groups)[number]["id"];
export type PartId = Extract<GroupId, "eyes" | "ears" | "legs" | "tail">;

export const partIds: PartId[] = ["eyes", "ears", "legs", "tail"];
export const isGroupId = (value: unknown): value is GroupId =>
  typeof value === "string" && groups.some((group) => group.id === value);
export const isPartId = (value: unknown): value is PartId =>
  typeof value === "string" && partIds.some((part) => part === value);

export const groupLabel = (id: GroupId) =>
  groups.find((group) => group.id === id)?.label ?? id;
