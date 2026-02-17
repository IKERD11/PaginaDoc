// Configuración e inicialización de Supabase
(function initSupabase() {
  // Verificar que Supabase esté disponible
  if (typeof supabase === 'undefined') {
    console.error('❌ Supabase no está cargado. Asegúrate de incluir el CDN de Supabase.');
    return;
  }

  // Configuración de Supabase
  const SUPABASE_URL = 'https://enqticnrhafgewwkjvmf.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_Z9Vd1iWbszUat1MyXmJktg_eSgbrWqs';

  // Crear cliente de Supabase
  const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Exponer cliente globalmente
  window.supabaseClient = supabaseClient;
  window.supabaseReady = true;

  console.log('✓ Supabase inicializado correctamente');
  console.log('  - URL:', SUPABASE_URL);
  console.log('  - Cliente disponible:', typeof window.supabaseClient !== 'undefined');

  // Notificar que Supabase está listo
  window.dispatchEvent(new Event('supabaseReady'));
})();
