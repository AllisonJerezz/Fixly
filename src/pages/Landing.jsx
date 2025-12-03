// src/pages/Landing.jsx
import { Link, Navigate } from "react-router-dom";
import { isAuthed } from "../api";

function WaveTop({ className = "", fill = "#fff" }) {
return (
<div className={className} aria-hidden>
<svg viewBox="0 0 1440 120" preserveAspectRatio="none" className="h-full w-full">
<path d="M0,64 C240,128 480,0 720,16 C960,32 1200,112 1440,64 L1440,0 L0,0 Z" fill={fill} />
</svg>
</div>
);
}

function WaveBottom({ className = "", fill = "#fff" }) {
return (
<div className={className} aria-hidden>
<svg viewBox="0 0 1440 120" preserveAspectRatio="none" className="h-full w-full rotate-180">
<path d="M0,64 C240,128 480,0 720,16 C960,32 1200,112 1440,64 L1440,0 L0,0 Z" fill={fill} />
</svg>
</div>
);
}

export default function Landing() {
if (isAuthed && isAuthed()) {
return <Navigate to="/home" replace />;
}

return (
<div className="relative">
{/* =================== HERO =================== */}
<section className="relative overflow-hidden">
{/* Fondo degradado */}
<div className="absolute inset-0 -z-10 bg-gradient-to-br from-indigo-900 via-indigo-800 to-blue-900" />
{/* halos suaves */}
<div className="pointer-events-none absolute -left-32 top-24 h-72 w-72 rounded-full bg-indigo-600/20 blur-3xl" />
<div className="pointer-events-none absolute right-0 -bottom-24 h-80 w-80 rounded-full bg-sky-500/10 blur-3xl" />

    <div className="mx-auto grid min-h-[80vh] max-w-6xl grid-cols-1 items-center gap-12 px-4 py-20 text-white lg:grid-cols-2 lg:gap-16">
      {/* Columna izquierda: texto */}
      <div>
        <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-5xl">
          Soluciones a un clic{" "}
          <span className="bg-gradient-to-r from-sky-300 via-white to-indigo-200 bg-clip-text text-transparent">
            Fixly te conecta
          </span>
        </h1>

        <p className="mt-4 max-w-xl text-sky-100/90">
          Publica lo que necesitas y recibe ofertas de profesionales.
          Si eres proveedor, encuentra trabajos cerca de ti y haz crecer tu negocio.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/register"
            className="rounded-2xl bg-white px-6 py-3 font-semibold text-indigo-700 shadow hover:bg-slate-50"
          >
            Crear cuenta
          </Link>
          <Link
            to="/login"
            className="rounded-2xl border border-white/40 px-6 py-3 font-semibold text-white/90 hover:bg-white/10"
          >
            Iniciar sesión
          </Link>
        </div>

        {/* mini badges */}
        <div className="mt-6 flex flex-wrap gap-3 text-xs text-indigo-100">
          <span className="rounded-full border border-white/20 px-3 py-1">Rápido</span>
          <span className="rounded-full border border-white/20 px-3 py-1">Seguro</span>
          <span className="rounded-full border border-white/20 px-3 py-1">Flexible</span>
        </div>
      </div>

      {/* Columna derecha: imagen */}
      <div className="flex items-center justify-center">
        <img
          src="/Landing_Fixly.png"
          alt="Ilustración Fixly"
          className="w-full max-w-xl rounded-tl-[80px] rounded-br-[80px] shadow-2xl"
        />
      </div>
    </div>

    {/* Curva hacia la siguiente sección (blanca) */}
    <WaveBottom className="h-16 w-full" fill="#ffffff" />
  </section>

  {/* =================== ¿CÓMO FUNCIONA? =================== */}
  <section className="bg-white">
    <div className="mx-auto max-w-6xl px-4 py-16">
      <div className="text-center">
        <h2 className="text-3xl font-extrabold text-slate-900">¿Cómo funciona?</h2>
      </div>

      <div className="mt-10 grid items-start gap-10 lg:grid-cols-2">
        {/* Columna izquierda: Imagen */}
        <div className="flex justify-center">
          <img
            src="/Landing.png"
            alt="Ilustración Fixly"
            className="w-full max-w-xl rounded-tl-[80px] rounded-br-[80px] shadow-2xl"
          />
        </div>

        {/* Columna derecha: Timeline */}
        <ol className="relative mx-auto w-full max-w-xl border-l border-slate-200 pl-6 lg:mx-10 mt-20">
          {[
            {
              t: "Crea tu solicitud",
              d: "Describe lo que necesitas, tu ubicación y la urgencia.",
              icon: (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <path d="M4 4h16v16H4z" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M7 8h10M7 12h10M7 16h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              ),
            },
            {
              t: "Recibe ofertas",
              d: "Compara precios, mensajes y reputación de proveedores.",
              icon: (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <path d="M12 3v18M3 12h18" stroke="currentColor" strokeWidth="1.8" />
                </svg>
              ),
            },
            {
              t: "Elige y coordina",
              d: "Acepta la mejor oferta y coordina fecha y alcance.",
              icon: (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <path
                    d="m5 13 4 4L19 7"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ),
            },
          ].map((step, i) => (
            <li key={step.t} className="mb-8 last:mb-0">
              {/* Punto del timeline */}
              <div className="absolute -left-[9px] mt-1.5 grid h-4 w-4 place-items-center rounded-full border-2 border-indigo-200 bg-white">
                <span className="block h-2 w-2 rounded-full bg-indigo-600" />
              </div>

              {/* Card pequeña */}
              <div className="rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur-sm hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-50 text-indigo-700">
                    {step.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1.5 text-xs font-bold text-white">
                        {i + 1}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900">{step.t}</h3>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{step.d}</p>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>

    {/* Curva hacia la siguiente sección azul */}
    <WaveBottom className="h-16 w-full" fill="#1e3a8a" />
  </section>

  {/* =================== BENEFICIOS =================== */}
  <section className="relative overflow-hidden">
    {/* fondo degradado */}
    <div className="absolute inset-0 -z-10 bg-gradient-to-br from-blue-900 via-indigo-800 to-indigo-900" />

    <div className="mx-auto max-w-6xl px-4 py-16 text-white">
      <div className="text-center">
        <h2 className="text-3xl font-extrabold">Beneficios clave</h2>
        <p className="mt-2 text-indigo-200">Pensado para clientes y proveedores.</p>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {/* Card 1 */}
        <div className="group relative overflow-hidden rounded-2xl border border-white/15 bg-white/5 p-6 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] backdrop-blur-sm transition-all duration-300 hover:translate-y-[-4px] hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.55)]">
          <div className="pointer-events-none absolute -top-16 right-0 h-40 w-40 rounded-full bg-sky-400/20 blur-2xl transition-opacity duration-300 group-hover:opacity-90" />
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-sky-400/15 text-sky-200 ring-1 ring-white/10">
            {/* ícono */}
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none">
              <path d="M4 4h16v16H4z" stroke="currentColor" strokeWidth="1.6" />
              <path d="M7 8h10M7 12h10M7 16h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </div>
          <h3 className="text-lg font-bold">Transparencia</h3>
          <p className="mt-1 text-indigo-100/90">Compara ofertas, mensajes y reputación en un solo lugar.</p>
          <ul className="mt-4 space-y-2 text-sm text-indigo-100/80">
            <li className="flex items-center gap-2">
              <span className="grid h-5 w-5 place-items-center rounded-md bg-white/10">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                  <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              Historial claro de ofertas
            </li>
            <li className="flex items-center gap-2">
              <span className="grid h-5 w-5 place-items-center rounded-md bg-white/10">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                  <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              Comunicación centralizada
            </li>
          </ul>
        </div>

        {/* Card 2 */}
        <div className="group relative overflow-hidden rounded-2xl border border-white/15 bg-white/5 p-6 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] backdrop-blur-sm transition-all duration-300 hover:translate-y-[-4px] hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.55)]">
          <div className="pointer-events-none absolute -top-16 right-0 h-40 w-40 rounded-full bg-emerald-400/20 blur-2xl transition-opacity duration-300 group-hover:opacity-90" />
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-200 ring-1 ring-white/10">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2v4M12 18v4M2 12h4M18 12h4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M19.1 4.9l-2.8 2.8M7.7 16.3l-2.8 2.8"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <h3 className="text-lg font-bold">Rapidez</h3>
          <p className="mt-1 text-indigo-100/90">Publica en minutos y recibe respuestas enseguida.</p>
          <ul className="mt-4 space-y-2 text-sm text-indigo-100/80">
            <li className="flex items-center gap-2">
              <span className="grid h-5 w-5 place-items-center rounded-md bg-white/10">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                  <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              Notificaciones al instante
            </li>
            <li className="flex items-center gap-2">
              <span className="grid h-5 w-5 place-items-center rounded-md bg-white/10">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                  <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              Filtros por oficio y zona
            </li>
          </ul>
        </div>

        {/* Card 3 */}
        <div className="group relative overflow-hidden rounded-2xl border border-white/15 bg-white/5 p-6 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] backdrop-blur-sm transition-all duration-300 hover:translate-y-[-4px] hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.55)]">
          <div className="pointer-events-none absolute -top-16 right-0 h-40 w-40 rounded-full bg-violet-400/20 blur-2xl transition-opacity duration-300 group-hover:opacity-90" />
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-violet-400/15 text-violet-200 ring-1 ring-white/10">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 3l9 4-9 4-9-4 9-4Zm0 8l9 4-9 4-9-4 9-4Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h3 className="text-lg font-bold">Flexibilidad</h3>
          <p className="mt-1 text-indigo-100/90">Ajusta horarios, materiales y alcance según tus necesidades.</p>
          <ul className="mt-4 space-y-2 text-sm text-indigo-100/80">
            <li className="flex items-center gap-2">
              <span className="grid h-5 w-5 place-items-center rounded-md bg-white/10">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                  <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              Re-negocia fácilmente
            </li>
            <li className="flex items-center gap-2">
              <span className="grid h-5 w-5 place-items-center rounded-md bg-white/10">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                  <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              Todo queda registrado
            </li>
          </ul>
        </div>
      </div>
    </div>

    {/* curva inferior blanca */}
    <WaveBottom className="h-16 w-full" fill="#ffffff" />
  </section>

  {/* =================== CATEGORÍAS POPULARES =================== */}
  <section className="bg-white">
    <div className="mx-auto max-w-6xl px-4 py-16">
      <div className="text-center">
        <h2 className="text-3xl font-extrabold text-slate-900">Categorías populares</h2>
        <p className="mt-2 text-slate-600">Encuentra el talento que necesitas.</p>
      </div>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 md:grid-cols-3">
        {[
          {
            name: "Plomería",
            color: "from-sky-50 to-white",
            icon: (
              <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none">
                <path d="M4 10h6v4H4zM10 12h10v2a4 4 0 0 1-4 4h-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ),
          },
          {
            name: "Electricidad",
            color: "from-amber-50 to-white",
            icon: (
              <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none">
                <path d="M13 3 4 14h6l-1 7 9-11h-6l1-7Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ),
          },
          {
            name: "Gasfitería",
            color: "from-cyan-50 to-white",
            icon: (
              <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14M7 8h10M9 16h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            ),
          },
          {
            name: "Carpintería",
            color: "from-rose-50 to-white",
            icon: (
              <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none">
                <path d="M3 12h18M6 7h12M6 17h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            ),
          },
          {
            name: "Pintura",
            color: "from-indigo-50 to-white",
            icon: (
              <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none">
                <path d="M4 8h16v4H4zM12 12v8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ),
          },
          {
            name: "Cerrajería",
            color: "from-violet-50 to-white",
            icon: (
              <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none">
                <path d="M7 11V7a5 5 0 1 1 10 0v4M5 11h14v10H5V11z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ),
          },
        ].map((c) => (
          <div
            key={c.name}
            className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            style={{ backgroundImage: `linear-gradient(to bottom right, var(--tw-gradient-stops))` }}
          >
            {/* Acento en borde */}
            <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-slate-200 transition-all group-hover:ring-indigo-300/60" />

            {/* Glow suave */}
            <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-indigo-400/10 blur-2xl opacity-0 transition group-hover:opacity-100" />

            {/* Contenido */}
            <div className={`rounded-xl bg-gradient-to-br ${c.color} p-4`}>
              <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm text-indigo-700">
                {c.icon}
              </div>
              <h3 className="text-base font-bold text-slate-900">{c.name}</h3>

              {/* Chips (opcionales) */}
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                {["Cerca de ti", "Verificados", "Rápidos"].map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-600"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Curva hacia CTA degradado */}
    <WaveBottom className="h-16 w-full" fill="#0f172a00" />
  </section>

  {/* =================== CTA FINAL =================== */}
<section className="relative overflow-hidden"> <WaveTop className="h-16 w-full" fill="#ffffff" /> <div className="absolute inset-0 -z-10 bg-gradient-to-br from-indigo-800 via-indigo-700 to-blue-700" /> <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" /> <div className="pointer-events-none absolute -left-20 -bottom-24 h-64 w-64 rounded-full bg-blue-400/10 blur-2xl" /> <div className="mx-auto max-w-6xl px-4 py-16 text-white text-center"> <h3 className="text-2xl font-extrabold">¿Listo para empezar?</h3> <p className="mt-2 text-indigo-100/90">Crea tu cuenta y publica tu primera solicitud.</p>
<div className="mt-6 flex justify-center gap-3">
  <Link to="/register" className="rounded-xl bg-white px-6 py-3 font-semibold text-indigo-700 hover:bg-slate-50">
    Crear cuenta
  </Link>
  <Link to="/login" className="rounded-xl border border-white/40 px-6 py-3 font-semibold text-white/90 hover:bg-white/10">
    Iniciar sesión
  </Link>
</div>
</div> <WaveBottom className="h-16 w-full" fill="#ffffff" /> </section>
</div>
);
}