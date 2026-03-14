import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import NouveauGroupeForm from './NouveauGroupeForm';

export default async function PromotionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile || !['super_admin', 'responsable_pedagogique'].includes(profile.role)) redirect('/dashboard');

  const { data: promotion } = await supabase.from('promotions').select('*').eq('id', id).single();
  if (!promotion) notFound();

  const { data: groupes } = await supabase
    .from('groupes')
    .select('*, profiles(nom)')
    .eq('promotion_id', id)
    .order('nom');

  const { data: budgets } = await supabase
    .from('vue_budget_groupes')
    .select('*')
    .eq('promotion_id', parseInt(id));

  const budgetMap = new Map(budgets?.map(b => [b.groupe_id, b]));

  return (
    <div>
      <div className="mb-6">
        <a href="/dashboard/promotions" className="text-sm text-slate-500 hover:text-slate-700">
          ← Retour aux promotions
        </a>
        <div className="mt-2">
          <h1 className="text-2xl font-bold text-slate-900">{promotion.nom}</h1>
          <p className="text-slate-500 text-sm mt-1">
            {promotion.annee_academique} — Budget par groupe : {Number(promotion.budget_par_groupe).toFixed(2)} €
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Groupes existants */}
        <div className="lg:col-span-2">
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200">
              <h2 className="font-semibold text-slate-900">
                Groupes ({groupes?.length || 0})
              </h2>
            </div>
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="table-header">Nom du groupe</th>
                  <th className="table-header">Compte étudiant</th>
                  <th className="table-header">Budget total</th>
                  <th className="table-header">Consommé</th>
                  <th className="table-header">Restant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {groupes?.length === 0 && (
                  <tr>
                    <td colSpan={5} className="table-cell text-center text-slate-400 py-8">
                      Aucun groupe. Créez-en un ci-contre.
                    </td>
                  </tr>
                )}
                {groupes?.map(g => {
                  const budget = budgetMap.get(g.id);
                  return (
                    <tr key={g.id} className="hover:bg-slate-50">
                      <td className="table-cell font-medium text-slate-900">{g.nom}</td>
                      <td className="table-cell text-slate-500 text-xs">
                        {g.profiles?.nom || <span className="text-amber-500">Pas de compte</span>}
                      </td>
                      <td className="table-cell">{budget ? `${Number(budget.budget_total).toFixed(2)} €` : '—'}</td>
                      <td className="table-cell text-amber-600">
                        {budget ? `${Number(budget.budget_consomme).toFixed(2)} €` : '—'}
                      </td>
                      <td className="table-cell">
                        {budget ? (
                          <span className={Number(budget.budget_restant) <= 0 ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
                            {Number(budget.budget_restant).toFixed(2)} €
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Formulaire nouveau groupe */}
        <div>
          <NouveauGroupeForm promotionId={promotion.id} />
        </div>
      </div>
    </div>
  );
}
