'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { pseudoToEmail } from '@/lib/utils';

export default function LoginPage() {
  const [pseudo, setPseudo] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    const email = pseudoToEmail(pseudo);

    const result = await supabase.auth.signInWithPassword({ email, password });

    if (result.error) {
      setErrorMsg('Erreur : ' + result.error.message);
      setLoading(false);
      return;
    }

    if (!result.data.session) {
      setErrorMsg('Pas de session créée. Réessayez.');
      setLoading(false);
      return;
    }

    window.location.href = '/dashboard';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cesi-950 via-cesi-800 to-cesi-600 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white/10 backdrop-blur rounded-2xl mb-4 border border-white/20">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Commandes CESI</h1>
          <p className="text-cesi-200 text-sm mt-1">Gestion des commandes de matériel</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">Connexion</h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="form-label">Pseudo</label>
              <input
                type="text"
                value={pseudo}
                onChange={e => setPseudo(e.target.value)}
                className="form-input"
                placeholder="Ex : admin"
                required
                autoComplete="username"
                autoFocus
              />
            </div>

            <div>
              <label className="form-label">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="form-input"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            {errorMsg && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                {errorMsg}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full btn-primary justify-center py-2.5">
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Connexion…
                </span>
              ) : 'Se connecter'}
            </button>
          </form>

          {/* Zone debug temporaire — à supprimer plus tard */}
          <div className="mt-4 p-3 bg-slate-50 rounded text-xs text-slate-400 break-all">
            Email tenté : {pseudo ? pseudoToEmail(pseudo) : '—'}
          </div>
        </div>

        <p className="text-center text-cesi-300 text-xs mt-6">CESI — Usage interne uniquement</p>
      </div>
    </div>
  );
}
