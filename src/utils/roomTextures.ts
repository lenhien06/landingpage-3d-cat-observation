import { createContext, createElement, useContext, useEffect, useMemo, type ReactNode } from "react";
import { useTexture } from "@react-three/drei";
import { CanvasTexture, NoColorSpace, RepeatWrapping, SRGBColorSpace, type Texture } from "three";

const textureUrl = (name: string) => `${import.meta.env.BASE_URL}textures/${name}.jpg`;

function canvasTexture(size: number, draw: (context: CanvasRenderingContext2D, random: () => number) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Không tạo được chất liệu căn phòng.");
  let seed = 127;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  draw(context, random);
  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function linenTexture() {
  return canvasTexture(256, (context, random) => {
    context.fillStyle = "#e8e3d9";
    context.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 256; i++) {
      const shade = Math.floor(180 + random() * 45);
      context.strokeStyle = `rgba(${shade},${shade - 5},${shade - 12},0.36)`;
      context.lineWidth = 0.7 + random() * 0.7;
      context.beginPath();
      context.moveTo(i, 0);
      context.lineTo(i + Math.sin(i) * 0.7, 256);
      context.moveTo(0, i);
      context.lineTo(256, i + Math.cos(i) * 0.7);
      context.stroke();
    }
    for (let i = 0; i < 14000; i++) {
      context.fillStyle = random() > 0.5 ? "#ffffff18" : "#5b4d3211";
      context.fillRect(random() * 256, random() * 256, 1, 1);
    }
  });
}

function oakTexture() {
  return canvasTexture(512, (context, random) => {
    context.fillStyle = "#ad865d";
    context.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 1000; i++) {
      const x = random() * 512;
      context.strokeStyle = random() > 0.5 ? "#edcf9a22" : "#59412c22";
      context.lineWidth = 0.3 + random() * 1.3;
      context.beginPath();
      context.moveTo(x, 0);
      for (let y = 0; y <= 512; y += 12) context.lineTo(x + Math.sin(y / 65 + x) * 2.2, y);
      context.stroke();
    }
  });
}

function rugTexture() {
  return canvasTexture(1024, (context, random) => {
    context.fillStyle = "#cec3aa";
    context.fillRect(0, 0, 1024, 1024);
    context.strokeStyle = "#747e69";
    context.lineWidth = 9;
    context.strokeRect(46, 46, 932, 932);
    context.lineWidth = 3;
    context.strokeRect(64, 64, 896, 896);
    for (let i = 0; i < 1024; i += 2) {
      context.strokeStyle = i % 4 ? "#f7f0d62b" : "#85785f2b";
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(i, 0); context.lineTo(i, 1024);
      context.moveTo(0, i); context.lineTo(1024, i);
      context.stroke();
    }
    for (let i = 0; i < 60000; i++) {
      context.fillStyle = random() > 0.5 ? "#ffffff12" : "#493b2312";
      context.fillRect(random() * 1024, random() * 1024, 1, 2);
    }
  });
}

function useTexturePack() {
  const images = useTexture([
    textureUrl("wood-floor-color"), textureUrl("wood-floor-normal"), textureUrl("wood-floor-roughness"),
    textureUrl("plaster-color"), textureUrl("plaster-normal"), textureUrl("plaster-roughness"),
  ]);
  const textures = useMemo(() => {
    const tiled = (source: Texture, repeat: number, color: boolean) => {
      const texture = source.clone();
      texture.wrapS = texture.wrapT = RepeatWrapping;
      texture.repeat.set(repeat, repeat);
      texture.colorSpace = color ? SRGBColorSpace : NoColorSpace;
      texture.anisotropy = 8;
      texture.needsUpdate = true;
      return texture;
    };
    const floor = {
      map: tiled(images[0]!, 40, true),
      normalMap: tiled(images[1]!, 40, false),
      roughnessMap: tiled(images[2]!, 40, false),
    };
    const plaster = {
      map: tiled(images[3]!, 1, true),
      normalMap: tiled(images[4]!, 1, false),
      roughnessMap: tiled(images[5]!, 1, false),
    };
    const linen = linenTexture();
    linen.repeat.set(3, 3);
    const linenBump = linen.clone();
    linenBump.colorSpace = NoColorSpace;
    const oak = oakTexture();
    const oakBump = oak.clone();
    oakBump.colorSpace = NoColorSpace;
    const rug = rugTexture();
    const rugBump = rug.clone();
    rugBump.colorSpace = NoColorSpace;
    return {
      floor, plaster,
      wood: { map: oak, bumpMap: oakBump },
      fabric: { map: linen, bumpMap: linenBump },
      rug: { map: rug, bumpMap: rugBump },
    };
  }, [images]);
  useEffect(() => () => {
    Object.values(textures).forEach((material) => Object.values(material).forEach((texture) => texture.dispose()));
  }, [textures]);
  return textures;
}

const RoomTextureContext = createContext<ReturnType<typeof useTexturePack> | null>(null);

export function RoomTexturesProvider({ children }: { children: ReactNode }) {
  const textures = useTexturePack();
  return createElement(RoomTextureContext.Provider, { value: textures }, children);
}

export function useRoomTextures() {
  const textures = useContext(RoomTextureContext);
  if (!textures) throw new Error("Chất liệu căn phòng chưa được khởi tạo.");
  return textures;
}

export function useGardenTexture() {
  const texture = useMemo(() => canvasTexture(512, (context, random) => {
    const sky = context.createLinearGradient(0, 0, 0, 512);
    sky.addColorStop(0, "#c4d9e0"); sky.addColorStop(0.56, "#e4e9d9"); sky.addColorStop(1, "#80926b");
    context.fillStyle = sky;
    context.fillRect(0, 0, 512, 512);
    context.filter = "blur(8px)";
    for (let i = 0; i < 300; i++) {
      const y = 140 + random() * 390;
      context.fillStyle = ["#55735588", "#a2b285aa", "#718b65aa", "#d1dbb999"][i % 4]!;
      context.beginPath();
      context.arc(random() * 560 - 24, y, 8 + random() * 36, 0, Math.PI * 2);
      context.fill();
    }
    context.filter = "none";
  }), []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}
