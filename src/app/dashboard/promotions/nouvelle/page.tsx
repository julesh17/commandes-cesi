// FICHIER : src/app/dashboard/promotions/nouvelle/page.tsx
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import NouvellePromotionForm from './NouvellePromotionForm';

export default async function NouvellePromotionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile || !['super_admin', 'responsable_pedagogique'].includes(profile.role)) redirect('/dashboard');

  const { data: assistantes } = await supabase
    .from('profiles')
    .select('id, nom')
    .eq('role', 'assistante')
    .order('nom');

  return (
    <div>
      <div className="mb-6">
        <a href="/dashboard/promotions" className="text-sm hover:underline" style={{ color: '#0071e3' }}>
          ← Retour aux promotions
        </a>
        <h1 className="text-2xl font-semibold tracking-tight mt-2" style={{ color: '#1d1d1f', letterSpacing: '-0.5px' }}>
          Nouvelle promotion
        </h1>
      </div>
      <div className="max-w-lg">
        <NouvellePromotionForm assistantes={assistantes || []} />
      </div>
    </div>
  );
}
