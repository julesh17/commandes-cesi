// src/app/dashboard/groupes/page.tsx
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function GroupesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile || profile.role === 'etudiant_groupe') redirect('/dashboard');

  const { data: budgets } = await supabase
    .from('vue_budget_groupes')
    .select('*')
    .order('promotion_nom');

  // Grouper par promotion
  const byPromotion = new Map<string, typeof budgets>();
  budgets?.forEach(b => {
    const key = b.promotion_nom;
    if (!byPromotion.has(key)) byPromotion.set(key, []);
    byPromotion.get(key)!.push(b);
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Groupes & Budgets</h1>
        <p className="text-slate-500 text-sm mt-1">Vue d&apos;ensemble des budgets par groupe</p>
      </div>

      {byPromotion.size === 0 && (
        <div className="card p-10 text-center text-slate-400">
          Aucun groupe trouvé. Créez d&apos;abord une promotion avec des groupes.
        </div>
      )}

      <div className="space-y-6">
        {Array.from(byPromotion.entries()).map(([promoNom, groupes]) => (
          <div key={promoNom} className="card overflow-hidden">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200">
              <h2 className="font-semibold text-slate-900">{promoNom}</h2>
            </div>
            <table className="w-full">
              <thead className="border-b border-slate-100">
                <tr>
                  <th className="table-header">Groupe</th>
                  <th className="table-header">Budget total</th>
                  <th className="table-header">Consommé</th>
                  <th className="table-header">Restant</th>
                  <th className="table-header">Utilisation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {groupes?.map(g => {
                  const pct = g.budget_total > 0
                    ? Math.min(100, (Number(g.budget_consomme) / Number(g.budget_total)) * 100)
                    : 0;
                  const isOver = Number(g.budget_restant) <= 0;
                  return (
                    <tr key={g.groupe_id} className="hover:bg-slate-50">
                      <td className="table-cell font-medium text-slate-900">{g.groupe_nom}</td>
                      <td className="table-cell">{Number(g.budget_total).toFixed(2)} €</td>
                      <td className="table-cell text-amber-600 font-medium">
                        {Number(g.budget_consomme).toFixed(2)} €
                      </td>
                      <td className="table-cell">
                        <span className={`font-semibold ${isOver ? 'text-red-600' : 'text-green-600'}`}>
                          {Number(g.budget_restant).toFixed(2)} €
                        </span>
                      </td>
                      <td className="table-cell w-40">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full transition-all ${isOver ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-green-500'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-400 w-8 text-right">{Math.round(pct)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
