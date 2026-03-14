// FICHIER : src/app/dashboard/commandes/page.tsx
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';
import type { Commande } from '@/types';

export default async function CommandesPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string; groupe?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile) redirect('/login');

  const isAdmin = ['super_admin', 'responsable_pedagogique', 'assistante'].includes(profile.role);
  const isSuperAdmin = profile.role === 'super_admin';
  const isResponsable = profile.role === 'responsable_pedagogique';
  const isAssistante = profile.role === 'assistante';

  let query = supabase
    .from('commandes')
    .select(`*, groupes(id, nom, promotion_id, promotions(id, nom, annee_academique, responsable_id, assistante_id)), fournisseurs(id, nom)`)
    .order('date_creation', { ascending: false });

  if (profile.role === 'etudiant_groupe') {
    // Étudiants : seulement leurs commandes
    const { data: groupe } = await supabase.from('groupes').select('id').eq('user_id', user.id).single();
    if (groupe) query = query.eq('groupe_id', groupe.id);
  } else if (isResponsable) {
    // Responsable : commandes des promotions dont il est responsable
    const { data: promos } = await supabase
      .from('promotions').select('id').eq('responsable_id', user.id);
    const promoIds = promos?.map(p => p.id) || [];
    if (promoIds.length === 0) {
      // Aucune promo assignée — aucune commande
      query = query.eq('groupe_id', -1);
    } else {
      const { data: groupes } = await supabase
        .from('groupes').select('id').in('promotion_id', promoIds);
      const groupeIds = groupes?.map(g => g.id) || [];
      if (groupeIds.length === 0) query = query.eq('groupe_id', -1);
      else query = query.in('groupe_id', groupeIds);
    }
  } else if (isAssistante) {
    // Assistante : commandes des promotions auxquelles elle est assignée
    const { data: promos } = await supabase
      .from('promotions').select('id').eq('assistante_id', user.id);
    const promoIds = promos?.map(p => p.id) || [];
    if (promoIds.length === 0) {
      query = query.eq('groupe_id', -1);
    } else {
      const { data: groupes } = await supabase
        .from('groupes').select('id').in('promotion_id', promoIds);
      const groupeIds = groupes?.map(g => g.id) || [];
      if (groupeIds.length === 0) query = query.eq('groupe_id', -1);
      else query = query.in('groupe_id', groupeIds);
      // Assistante ne voit que les commandes validées ou au-delà
      query = query.in('statut', ['validee', 'commandee', 'non_commandable', 'colis_arrive', 'receptionnee']);
    }
  }

  if (params.statut) query = query.eq('statut', params.statut);
  if (params.groupe) query = query.eq('groupe_id', params.groupe);

  const { data: commandes, error } = await query;
  if (error) throw new Error(error.message);

  const canSeeRealPrice = isSuperAdmin || isResponsable || isAssistante;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: '#1d1d1f', letterSpacing: '-0.5px' }}>Commandes</h1>
          <p className="text-sm mt-0.5" style={{ color: '#6e6e73' }}>
            {commandes?.length || 0} commande{(commandes?.length || 0) > 1 ? 's' : ''}
            {isAssistante && <span className="ml-2 text-xs px-2 py-0.5 rounded-full" style={{ background: '#f2f2f7', color: '#6e6e73' }}>Commandes validées uniquement</span>}
          </p>
        </div>
        {/* Nouvelle commande : étudiants seulement (les admins ne soumettent pas) */}
        {profile.role === 'etudiant_groupe' && (
          <Link href="/dashboard/commandes/nouvelle" className="btn-primary">+ Nouvelle commande</Link>
        )}
      </div>

      {/* Filtres par statut */}
      {isAdmin && (
        <div className="card p-4 mb-5 flex flex-wrap gap-2">
          {(isAssistante
            ? ['validee','commandee','colis_arrive','receptionnee','non_commandable'] as const
            : ['en_attente','validee','commandee','colis_arrive','receptionnee','refusee','non_commandable'] as const
          ).map(s => (
            <Link key={s} href={params.statut === s ? '/dashboard/commandes' : `/dashboard/commandes?statut=${s}`}
              className="px-3 py-1 rounded-full text-xs font-medium border transition-all"
              style={params.statut === s
                ? { backgroundColor: '#0071e3', color: '#fff', borderColor: '#0071e3' }
                : { background: '#fff', color: '#6e6e73', borderColor: '#e5e5ea' }}>
              {{ en_attente:'En attente', validee:'Validée', commandee:'Commandée', colis_arrive:'Colis arrivé', receptionnee:'Réceptionnée', refusee:'Refusée', non_commandable:'Non commandable' }[s]}
            </Link>
          ))}
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ background: '#fafafa', borderBottom: '1px solid #e5e5ea' }}>
              <tr>
                <th className="table-header">N°</th>
                {isAdmin && <th className="table-header">Groupe</th>}
                <th className="table-header">Description</th>
                <th className="table-header">Fournisseur</th>
                <th className="table-header">Prix estimé</th>
                {canSeeRealPrice && <th className="table-header">Prix réel</th>}
                <th className="table-header">Statut</th>
                <th className="table-header">Date</th>
                <th className="table-header"></th>
              </tr>
            </thead>
            <tbody>
              {(!commandes || commandes.length === 0) && (
                <tr>
                  <td colSpan={isAdmin ? 9 : 7} className="table-cell text-center py-12" style={{ color: '#aeaeb2' }}>
                    Aucune commande.
                  </td>
                </tr>
              )}
              {commandes?.map((c: Commande) => (
                <tr key={c.id} style={{ borderTop: '1px solid #f2f2f7' }}>
                  <td className="table-cell font-mono text-xs" style={{ color: '#aeaeb2' }}>#{c.id}</td>
                  {isAdmin && (
                    <td className="table-cell">
                      <p className="font-medium text-sm" style={{ color: '#1d1d1f' }}>{c.groupes?.nom}</p>
                      <p className="text-xs" style={{ color: '#aeaeb2' }}>{c.groupes?.promotions?.nom}</p>
                    </td>
                  )}
                  <td className="table-cell max-w-48">
                    <a href={c.lien_produit} target="_blank" rel="noopener noreferrer"
                       className="font-medium text-sm hover:underline line-clamp-1" style={{ color: '#0071e3' }}>
                      {c.description}
                    </a>
                  </td>
                  <td className="table-cell text-sm" style={{ color: '#3a3a3c' }}>{c.fournisseurs?.nom || '—'}</td>
                  <td className="table-cell text-sm font-medium" style={{ color: '#1d1d1f' }}>{Number(c.prix_estime).toFixed(2)} €</td>
                  {canSeeRealPrice && (
                    <td className="table-cell text-sm" style={{ color: '#6e6e73' }}>
                      {c.prix_reel ? `${Number(c.prix_reel).toFixed(2)} €` : '—'}
                    </td>
                  )}
                  <td className="table-cell"><StatusBadge statut={c.statut} /></td>
                  <td className="table-cell text-xs whitespace-nowrap" style={{ color: '#aeaeb2' }}>
                    {new Date(c.date_creation).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="table-cell">
                    <Link href={`/dashboard/commandes/${c.id}`}
                          className="text-sm font-medium hover:underline" style={{ color: '#0071e3' }}>
                      Voir →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
