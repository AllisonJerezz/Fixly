import { useRef, useState } from "react";
import { readProfile, saveProfile } from "../api";

/** Redimensiona a un cuadrado máx 256px, devuelve dataURL */
async function toSquareDataURL(file, maxSize = 256) {
  const img = await new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = fr.result;
    };
    fr.onerror = rej;
    fr.readAsDataURL(file);
  });

  const size = Math.min(maxSize, Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  // fondo transparente
  ctx.clearRect(0, 0, size, size);

  // cover
  const ratio = Math.max(size / img.width, size / img.height);
  const w = img.width * ratio;
  const h = img.height * ratio;
  const x = (size - w) / 2;
  const y = (size - h) / 2;
  ctx.drawImage(img, x, y, w, h);

  // export (calidad media)
  return canvas.toDataURL("image/jpeg", 0.8);
}

export default function AvatarPicker({
  size = 72,         // tamaño visual en px (círculo)
  onChange,          // callback opcional (dataURL)
  className = "",
}) {
  const inputRef = useRef(null);
  const profile = readProfile() || {};
  const [photo, setPhoto] = useState(profile.photoURL || "");

  async function handleSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataURL = await toSquareDataURL(file, 256);
      // guarda en perfil
      const next = { ...profile, photoURL: dataURL };
      saveProfile(next);
      setPhoto(dataURL);
      onChange?.(dataURL);
    } catch {
      // noop
    } finally {
      e.target.value = "";
    }
  }

  return (
    <div className={["flex items-center gap-3", className].join(" ")}>
      <div
        className="relative shrink-0 rounded-full border border-white/15 bg-white/5 shadow"
        style={{ width: size, height: size }}
      >
        <img
          src={photo || "/avatar-fallback.png"}
          alt="Tu avatar"
          className="h-full w-full rounded-full object-cover"
          onError={(e) => { e.currentTarget.src = "/avatar-fallback.png"; }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full border border-white/20 bg-white/15 text-xs text-white/90 backdrop-blur hover:bg-white/25"
          title="Cambiar foto"
          aria-label="Cambiar foto"
        >
          ✏️
        </button>
      </div>

      <div className="text-sm text-indigo-100/85">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-lg border border-white/20 bg-white/10 px-2.5 py-1 font-semibold text-white hover:bg-white/15"
        >
          Cambiar foto
        </button>
        <div className="mt-1 text-[11px] text-indigo-200/80">
          JPG/PNG. Se recorta al centro y se ajusta.
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleSelect}
      />
    </div>
  );
}
