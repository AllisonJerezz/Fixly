// src/pages/Verify.jsx
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { verifyEmail, setAuth, fetchProfileAndCache, hasOnboardingDone } from '../api';

export default function Verify() {
  const [sp] = useSearchParams();
  const [status, setStatus] = useState('validating');
  const [msg, setMsg] = useState('Validando enlace...');
  const navigate = useNavigate();

  useEffect(() => {
    const uid = sp.get('uid') || '';
    const token = sp.get('token') || '';
    (async () => {
      try {
        if (!uid || !token) throw new Error('Enlace inválido');
        const res = await verifyEmail(uid, token);
        const username = res?.user?.username || '';
        const access = res?.token || '';
        if (username && access) {
          setAuth(username, access);
          try { await fetchProfileAndCache(); } catch {}
          setStatus('ok');
          setMsg('Cuenta verificada. Redirigiendo...');
          setTimeout(() => {
            const go = hasOnboardingDone() ? '/home' : '/onboarding';
            navigate(go, { replace: true });
          }, 800);
        } else {
          setStatus('ok');
          setMsg('Cuenta verificada. Puedes iniciar sesión.');
        }
      } catch (e) {
        setStatus('err');
        setMsg(e?.message || 'El enlace no es válido o expiró');
      }
    })();
  }, []);

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-indigo-900 via-indigo-800 to-blue-900" />
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-md grid-cols-1 items-center gap-6 px-4 py-16 text-white">
        <div className="w-full">
          <div className="rounded-3xl border border-white/15 bg-white/10 p-8 shadow-2xl backdrop-blur">
            <div className="mb-4 text-center text-xl font-semibold">Verificación de email</div>
            <div className={`rounded-xl px-4 py-3 text-sm ${status==='err' ? 'border border-rose-300/40 bg-rose-500/10 text-rose-100' : 'border border-emerald-300/40 bg-emerald-500/10 text-emerald-100'}`}>
              {msg}
            </div>
            {status==='err' && (
              <p className="mt-4 text-center text-sm">
                Ir al <Link to="/login" className="font-semibold text-white hover:underline">inicio de sesión</Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
