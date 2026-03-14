import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import StatusBadge from '@/components/StatusBadge';
import CommandeActions from './CommandeActions';
import type { Commande } from '@/types';

export default async function CommandeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile) redirect('/login');

  const { data: commande } = await supabase
    .from('commandes')
    .select(`*, groupes(id, nom, promotion_id, promotions(id, nom, annee_academique)), fournisseurs(id, nom, site_web)`)
    .eq('id', id)
    .single();

  if (!commande) notFound();

  const isAdmin = ['super_admin', 'responsable_pedagogique', 'assistante'].includes(profile.role);
  const isEtudiant = profile.role === 'etudiant_groupe';

  // Vérifier que l'étudiant appartient bien à ce groupe
  if (isEtudiant) {
    const { data: groupe } = await supabase.from('groupes').select('id').eq('user_id', user.id).single();
    if (!groupe || groupe.id !== commande.groupe_id) redirect('/dashboard/commandes');
  }

  const { data: historique } = await supabase
    .from('historique_commandes')
    .select('*, profiles(nom, role)')
    .eq('commande_id', id)
    .order('created_at', { ascending: true });

  const cmd = commande as Commande;

  const mailtoLink = `mailto:${cmd.email_referent}?subject=Commande%20CESI%20arriv%C3%A9e&body=Bonjour%2C%0A%0AVotre%20commande%20est%20arriv%C3%A9e%20%C3%A0%20l'%C3%A9cole%20CESI.%20Vous%20pouvez%20venir%20la%20r%C3%A9cup%C3%A9rer%20%C3%A0%20l'accueil.%0A%0ACordialement%2C%0AL'%C3%A9quipe%20CESI`;

  return (
    <div>
      <div className="mb-6">
        <a href="/dashboard/commandes" className="text-sm text-slate-500 hover:text-slate-700">
          ← Retour aux commandes
        </a>
        <div className="flex items-start justify-between mt-2">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Commande #{cmd.id}
            </h1>
            <p className="text-slate-500 text-sm mt-1">{cmd.description}</p>
          </div>
          <StatusBadge statut={cmd.statut} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne principale */}
        <div className="lg:col-span-2 space-y-5">
          {/* Infos produit */}
          <div className="card p-5">
            <h2 className="font-semibold text-slate-900 mb-4">Détails du produit</h2>
            <dl className="space-y-3">
              <div className="flex justify-between text-sm">
                <dt className="text-slate-500">Description</dt>
                <dd className="text-slate-900 font-medium text-right max-w-64">{cmd.description}</dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt className="text-slate-500">Lien produit</dt>
                <dd>
                  <a href={cmd.lien_produit} target="_blank" rel="noopener noreferrer"
                    className="text-cesi-600 hover:underline text-sm">
                    Voir le produit ↗
                  </a>
                </dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt className="text-slate-500">Fournisseur</dt>
                <dd className="text-slate-900">{cmd.fournisseurs?.nom || '—'}</dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt className="text-slate-500">Prix estimé TTC</dt>
                <dd className="text-slate-900 font-medium">{Number(cmd.prix_estime).toFixed(2)} €</dd>
              </div>
              {isAdmin && cmd.prix_reel && (
                <div className="flex justify-between text-sm">
                  <dt className="text-slate-500">Prix réel payé</dt>
                  <dd className="text-slate-900 font-semibold text-green-700">{Number(cmd.prix_reel).toFixed(2)} €</dd>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <dt className="text-slate-500">Référent étudiant</dt>
                <dd className="text-slate-900">{cmd.email_referent}</dd>
              </div>
            </dl>
          </div>

          {/* Groupe */}
          <div className="card p-5">
            <h2 className="font-semibold text-slate-900 mb-4">Groupe</h2>
            <dl className="space-y-3">
              <div className="flex justify-between text-sm">
                <dt className="text-slate-500">Groupe</dt>
                <dd className="text-slate-900 font-medium">{cmd.groupes?.nom}</dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt className="text-slate-500">Promotion</dt>
                <dd className="text-slate-900">{cmd.groupes?.promotions?.nom}</dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt className="text-slate-500">Année académique</dt>
                <dd className="text-slate-900">{cmd.groupes?.promotions?.annee_academique}</dd>
              </div>
            </dl>
          </div>

          {/* Dates */}
          <div className="card p-5">
            <h2 className="font-semibold text-slate-900 mb-4">Chronologie</h2>
            <div className="space-y-2">
              {[
                { label: 'Créée le', date: cmd.date_creation },
                { label: 'Validée le', date: cmd.date_validation },
                { label: 'Commandée le', date: cmd.date_commande },
                { label: 'Colis arrivé le', date: cmd.date_colis_arrive },
                { label: 'Réceptionnée le', date: cmd.date_reception },
              ].map(({ label, date }) => date && (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-slate-500">{label}</span>
                  <span className="text-slate-900">
                    {new Date(date).toLocaleDateString('fr-FR', {
                      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Historique */}
          {isAdmin && historique && historique.length > 0 && (
            <div className="card p-5">
              <h2 className="font-semibold text-slate-900 mb-4">Historique des actions</h2>
              <ol className="space-y-3">
                {historique.map((h: { id: number; action: string; details: string; created_at: string; profiles?: { nom: string; role: string } }) => (
                  <li key={h.id} className="flex gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-cesi-400 mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="text-slate-900 font-medium">{h.action}</p>
                      {h.details && <p className="text-slate-500 text-xs">{h.details}</p>}
                      <p className="text-slate-400 text-xs mt-0.5">
                        {h.profiles?.nom || 'Système'} — {new Date(h.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-4">
          {isAdmin && (
            <CommandeActions
              commande={cmd}
              profile={profile}
              mailtoLink={mailtoLink}
            />
          )}
          {isEtudiant && cmd.statut === 'colis_arrive' && (
            <div className="card p-5">
              <div className="flex items-center gap-2 text-purple-700 mb-3">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                <span className="font-semibold">Votre colis est arrivé !</span>
              </div>
              <p className="text-sm text-slate-600">
                Votre commande est disponible à l&apos;accueil de l&apos;école. Vous pouvez venir la récupérer.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
