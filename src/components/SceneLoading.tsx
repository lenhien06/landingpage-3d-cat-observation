import { Cat, PawPrint } from "lucide-react";
import "../styles/scene-loading.css";

type Props = { leaving?: boolean };

export function SceneLoading({ leaving = false }: Props) {
  return (
    <div
      className={`scene-loading${leaving ? " scene-loading--leaving" : ""}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="scene-loading-card">
        <div className="scene-loading-character" aria-hidden="true">
          <span className="scene-loading-halo" />
          <div className="scene-loading-cat">
            <Cat size={72} strokeWidth={1.35} focusable="false" />
          </div>
        </div>
        <div className="scene-loading-paws" aria-hidden="true">
          <PawPrint size={16} strokeWidth={1.65} focusable="false" />
          <PawPrint size={16} strokeWidth={1.65} focusable="false" />
          <PawPrint size={16} strokeWidth={1.65} focusable="false" />
        </div>
        <h2 className="scene-loading-title">Chú mèo đang đến…</h2>
        <p className="scene-loading-description">Đang chuẩn bị căn phòng để em quan sát.</p>
        <div className="scene-loading-bar" aria-hidden="true" />
      </div>
    </div>
  );
}
