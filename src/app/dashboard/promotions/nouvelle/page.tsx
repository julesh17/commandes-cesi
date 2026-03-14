// src/app/dashboard/promotions/nouvelle/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function NouvellePromotionPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    nom: '',
    annee_academique: '',
    budget_par_groupe: '150',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.nom.trim()) { setError('Le nom est requis.'); return; }
    if (!/^\d{4}-\d{4}$/.test(form.annee_academique)) {
      setError('L\'année académique doit être au format YYYY-YYYY (ex : 2025-2026).'); return;
    }
    if (isNaN(Number(form.budget_par_groupe)) || Number(form.budget_par_groupe) <= 0) {
      setError('Le budget doit être un nombre positif.'); return;
    }

    setLoading(true);
    const { error: err } = await supabase.from('promotions').insert({
      nom: form.nom.trim(),
      annee_academique: form.annee_academique.trim(),
      budget_par_groupe: parseFloat(form.budget_par_groupe),
    });

    if (err) {
      setError('Erreur : ' + err.message);
      setLoading(false);
    } else {
      router.push('/dashboard/promotions');
      router.refresh();
    }
  };

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  return (
    <div>
      <div className="mb-6">
        <a href="/dashboard/promotions" className="text-sm text-slate-500 hover:text-slate-700">
          ← Retour aux promotions
        </a>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">Nouvelle promotion</h1>
      </div>

      <div className="max-w-lg">
        <form onSubmit={handleSubmit} className="card p-6 space-y-5">
          <div>
            <label className="form-label">Nom de la promotion *</label>
            <input type="text" value={form.nom} onChange={set('nom')} className="form-input"
              placeholder="Ex : Bachelor Informatique" required />
          </div>

          <div>
            <label className="form-label">Année académique *</label>
            <input type="text" value={form.annee_academique} onChange={set('annee_academique')}
              className="form-input" placeholder="2025-2026" pattern="\d{4}-\d{4}" required />
            <p className="text-xs text-slate-400 mt-1">Format : YYYY-YYYY</p>
          </div>

          <div>
            <label className="form-label">Budget par groupe (€) *</label>
            <input type="number" step="0.01" min="1" value={form.budget_par_groupe}
              onChange={set('budget_par_groupe')} className="form-input" required />
            <p className="text-xs text-slate-400 mt-1">
              Ce budget sera attribué indépendamment à chaque groupe de cette promotion.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Création…' : 'Créer la promotion'}
            </button>
            <a href="/dashboard/promotions" className="btn-secondary">Annuler</a>
          </div>
        </form>
      </div>
    </div>
  );
}
