// src/app/dashboard/commandes/nouvelle/NouvelleCommandeForm.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Fournisseur } from '@/types';

interface Props {
  fournisseurs: Fournisseur[];
  groupeId: number | null;
  groupes: Array<{ id: number; nom: string; promotions?: { nom: string; annee_academique: string } }> | null;
  budgetRestant: number;
  isAdmin: boolean;
}

export default function NouvelleCommandeForm({ fournisseurs, groupeId, groupes, budgetRestant, isAdmin }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    lien_produit: '',
    description: '',
    fournisseur_id: '',
    prix_estime: '',
    email_referent: '',
    groupe_id: groupeId ? String(groupeId) : '',
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!form.lien_produit.trim()) errors.lien_produit = 'Le lien est requis.';
    if (!form.description.trim()) errors.description = 'La description est requise.';
    if (!form.fournisseur_id) errors.fournisseur_id = 'Veuillez sélectionner un fournisseur.';
    if (!form.prix_estime || isNaN(Number(form.prix_estime)) || Number(form.prix_estime) <= 0)
      errors.prix_estime = 'Le prix estimé doit être un nombre positif.';
    if (!form.email_referent.trim()) {
      errors.email_referent = 'L\'email du référent est requis.';
    } else if (!form.email_referent.endsWith('@viacesi.fr')) {
      errors.email_referent = 'L\'email doit être une adresse CESI se terminant par @viacesi.fr.';
    }
    if (!form.groupe_id) errors.groupe_id = 'Veuillez sélectionner un groupe.';
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const prix = Number(form.prix_estime);

    // Vérification budget pour les étudiants
    if (!isAdmin && prix > budgetRestant) {
      setError(`Le prix estimé (${prix.toFixed(2)} €) dépasse le budget restant de votre groupe (${budgetRestant.toFixed(2)} €). Aucune commande ne peut être soumise.`);
      return;
    }

    setLoading(true);

    const { error: insertError } = await supabase.from('commandes').insert({
      groupe_id: parseInt(form.groupe_id),
      lien_produit: form.lien_produit.trim(),
      description: form.description.trim(),
      fournisseur_id: parseInt(form.fournisseur_id),
      prix_estime: prix,
      email_referent: form.email_referent.trim().toLowerCase(),
      statut: 'en_attente',
    });

    setLoading(false);

    if (insertError) {
      setError('Une erreur est survenue : ' + insertError.message);
    } else {
      router.push('/dashboard/commandes');
      router.refresh();
    }
  };

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    setFieldErrors(prev => ({ ...prev, [field]: '' }));
  };

  return (
    <div className="max-w-2xl">
      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        {isAdmin && groupes && (
          <div>
            <label className="form-label">Groupe *</label>
            <select value={form.groupe_id} onChange={set('groupe_id')} className="form-input">
              <option value="">Sélectionner un groupe…</option>
              {groupes.map(g => (
                <option key={g.id} value={g.id}>
                  {g.nom} {g.promotions ? `— ${g.promotions.nom} (${g.promotions.annee_academique})` : ''}
                </option>
              ))}
            </select>
            {fieldErrors.groupe_id && <p className="form-error">{fieldErrors.groupe_id}</p>}
          </div>
        )}

        <div>
          <label className="form-label">Lien vers le produit *</label>
          <input
            type="url"
            value={form.lien_produit}
            onChange={set('lien_produit')}
            className="form-input"
            placeholder="https://www.amazon.fr/..."
          />
          {fieldErrors.lien_produit && <p className="form-error">{fieldErrors.lien_produit}</p>}
        </div>

        <div>
          <label className="form-label">Description du produit *</label>
          <textarea
            value={form.description}
            onChange={set('description')}
            className="form-input resize-none"
            rows={3}
            placeholder="Décrivez précisément le produit (référence, utilisation…)"
          />
          {fieldErrors.description && <p className="form-error">{fieldErrors.description}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">Fournisseur *</label>
            <select value={form.fournisseur_id} onChange={set('fournisseur_id')} className="form-input">
              <option value="">Choisir…</option>
              {fournisseurs.map(f => (
                <option key={f.id} value={f.id}>{f.nom}</option>
              ))}
            </select>
            {fieldErrors.fournisseur_id && <p className="form-error">{fieldErrors.fournisseur_id}</p>}
          </div>

          <div>
            <label className="form-label">
              Prix estimé TTC (€) *
              {!isAdmin && (
                <span className="text-slate-400 font-normal ml-1">
                  — max {budgetRestant.toFixed(2)} €
                </span>
              )}
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={form.prix_estime}
              onChange={set('prix_estime')}
              className="form-input"
              placeholder="0.00"
            />
            {fieldErrors.prix_estime && <p className="form-error">{fieldErrors.prix_estime}</p>}
          </div>
        </div>

        <div>
          <label className="form-label">Email du référent étudiant *</label>
          <input
            type="email"
            value={form.email_referent}
            onChange={set('email_referent')}
            className="form-input"
            placeholder="prenom.nom@viacesi.fr"
          />
          <p className="text-xs text-slate-400 mt-1">
            L'email doit obligatoirement se terminer par @viacesi.fr. Le référent sera contacté à l'arrivée du colis.
          </p>
          {fieldErrors.email_referent && <p className="form-error">{fieldErrors.email_referent}</p>}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Envoi en cours…' : 'Soumettre la demande'}
          </button>
          <a href="/dashboard/commandes" className="btn-secondary">
            Annuler
          </a>
        </div>
      </form>
    </div>
  );
}
