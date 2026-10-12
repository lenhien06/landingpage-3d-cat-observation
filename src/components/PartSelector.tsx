import { Eye, Ear, Footprints, MoveUpRight } from "lucide-react";
import { partIds, type PartId } from "../data/questions";

const partInfo = {
  eyes: { label: "Mắt", Icon: Eye },
  ears: { label: "Tai", Icon: Ear },
  legs: { label: "Chân", Icon: Footprints },
  tail: { label: "Đuôi", Icon: MoveUpRight },
} as const;

export function PartSelector({
  selectedPart,
  onPartSelect,
}: {
  selectedPart: PartId | null;
  onPartSelect: (part: PartId) => void;
}) {
  return (
    <div className="part-selector" aria-label="Chọn bộ phận của mèo">
      {partIds.map((part) => {
        const { label, Icon } = partInfo[part];
        return (
          <button
            key={part}
            type="button"
            className={`part-button ${selectedPart === part ? "is-active" : ""}`}
            aria-pressed={selectedPart === part}
            onClick={() => onPartSelect(part)}
          >
            <Icon size={19} strokeWidth={1.8} />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
