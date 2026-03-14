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

  let query = supabase
    .from('commandes')
    .select(`*, groupes(id, nom, promotions(id, nom, annee_academique)), fournisseurs(id, nom)`)
    .order('date_creation', { ascending: false });

  if (profile.role === 'etudiant_groupe') {
    const { data: groupe } = await supabase.from('groupes').select('id').eq('user_id', user.id).single();
    if (groupe) query = query.eq('groupe_id', groupe.id);
  }
  if (params.statut) query = query.eq('statut', params.statut);
  if (params.groupe) query = query.eq('groupe_id', params.groupe);

  const { data: commandes, error } = await query;
  if (error) throw new Error(error.message);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: '#1d1d1f', letterSpacing: '-0.5px' }}>Commandes</h1>
          <p className="text-sm mt-0.5" style={{ color: '#6e6e73' }}>
            {commandes?.length || 0} commande{(commandes?.length || 0) > 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/dashboard/commandes/nouvelle" className="btn-primary">+ Nouvelle commande</Link>
      </div>

      {/* Filtres simples */}
      {isAdmin && (
        <div className="card p-4 mb-5 flex flex-wrap gap-3">
          {(['en_attente','validee','commandee','colis_arrive','receptionnee','refusee','non_commandable'] as const).map(s => (
            <Link key={s} href={params.statut === s ? '/dashboard/commandes' : `/dashboard/commandes?statut=${s}`}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                params.statut === s
                  ? 'border-transparent text-white'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
              style={params.statut === s ? { backgroundColor: '#0071e3' } : {}}>
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
                {isAdmin && <th className="table-header">Prix réel</th>}
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
                <tr key={c.id} className="transition-colors" style={{ borderTop: '1px solid #f2f2f7' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}>
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
                  {isAdmin && (
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
