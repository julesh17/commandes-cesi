// src/app/api/groupes/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    // Vérifier que l'appelant est authentifié et a les droits
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || !['super_admin', 'responsable_pedagogique'].includes(profile.role)) {
      return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 });
    }

    const body = await request.json();
    const { promotion_id, nom_groupe, email, password, nom_compte } = body;

    if (!promotion_id || !nom_groupe || !email || !password) {
      return NextResponse.json({ error: 'Champs requis manquants.' }, { status: 400 });
    }

    // Créer le compte Supabase Auth avec le client admin
    const adminClient = createAdminClient();
    const { data: newUser, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      return NextResponse.json({ error: 'Erreur création compte : ' + authError.message }, { status: 400 });
    }

    const newUserId = newUser.user.id;

    // Créer le profil avec rôle étudiant_groupe
    const { error: profileError } = await adminClient.from('profiles').insert({
      id: newUserId,
      role: 'etudiant_groupe',
      nom: nom_compte || nom_groupe,
    });

    if (profileError) {
      // Rollback : supprimer le user créé
      await adminClient.auth.admin.deleteUser(newUserId);
      return NextResponse.json({ error: 'Erreur création profil : ' + profileError.message }, { status: 400 });
    }

    // Créer le groupe lié à ce compte
    const { error: groupeError } = await adminClient.from('groupes').insert({
      promotion_id,
      nom: nom_groupe,
      user_id: newUserId,
    });

    if (groupeError) {
      // Rollback
      await adminClient.from('profiles').delete().eq('id', newUserId);
      await adminClient.auth.admin.deleteUser(newUserId);
      return NextResponse.json({ error: 'Erreur création groupe : ' + groupeError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
