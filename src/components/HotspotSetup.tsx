import { Download, MapPin, Trash2 } from "lucide-react";
import { partIds, type PartId } from "../data/questions";
import type { Hotspot } from "../utils/hotspots";

type Props = {
  points: Hotspot[];
  part: PartId;
  replacingId: string | null;
  onPartChange: (part: PartId) => void;
  onReplace: (id: string | null) => void;
  onDelete: (id: string) => void;
};

export function HotspotSetup({
  points,
  part,
  replacingId,
  onPartChange,
  onReplace,
  onDelete,
}: Props) {
  const exportJson = () => {
    const blob = new Blob(
      [JSON.stringify({ version: 1, points }, null, 2) + "\n"],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "hotspots.json";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <section className="setup-panel">
      <div className="setup-heading">
        <MapPin size={20} />
        <div>
          <h2>Thiết lập điểm đánh dấu</h2>
          <p>Chỉ dành cho người tích hợp mô hình</p>
        </div>
      </div>
      <p>
        Chọn bộ phận rồi bấm lên bề mặt mèo để thêm điểm. Chọn “Sửa” để dời một
        điểm hiện có.
      </p>
      <label htmlFor="setup-part">Bộ phận cần đánh dấu</label>
      <select
        id="setup-part"
        value={part}
        onChange={(event) => {
          onPartChange(event.target.value as PartId);
          onReplace(null);
        }}
      >
        {partIds.map((id) => (
          <option key={id} value={id}>
            {{ eyes: "Mắt", ears: "Tai", legs: "Chân", tail: "Đuôi" }[id]}
          </option>
        ))}
      </select>
      <ul className="setup-points">
        {points
          .filter((point) => point.partId === part)
          .map((point, index) => (
            <li key={point.id}>
              <span>
                Điểm {index + 1}
                <small>
                  {point.position.map((n) => n.toFixed(2)).join(", ")}
                </small>
              </span>
              <button
                type="button"
                className={replacingId === point.id ? "is-active" : ""}
                onClick={() =>
                  onReplace(replacingId === point.id ? null : point.id)
                }
              >
                {replacingId === point.id ? "Đang sửa" : "Sửa"}
              </button>
              <button
                type="button"
                aria-label={`Xóa điểm ${index + 1}`}
                onClick={() => onDelete(point.id)}
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
      </ul>
      <button type="button" className="export-button" onClick={exportJson}>
        <Download size={17} /> Xuất hotspots.json
      </button>
      <p className="setup-tip">
        Chép file tải về vào <code>src/config/hotspots.json</code> rồi tải lại
        trang. Các điểm được lưu theo tọa độ mô hình và sẽ đi theo mèo khi xoay.
      </p>
    </section>
  );
}
