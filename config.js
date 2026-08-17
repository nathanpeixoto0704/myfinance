// ============================================================
// CONFIGURAÇÃO DO SUPABASE
// ============================================================
// 1. Vá em supabase.com -> seu projeto -> Project Settings -> API
// 2. Copie "Project URL" e cole em SUPABASE_URL
// 3. Copie a chave "anon public" e cole em SUPABASE_ANON_KEY
//    (NUNCA use a "service_role" key aqui, ela é secreta e não pode
//    ir para um repositório público como o GitHub Pages)
// 4. Troque TABLE_NAME se sua tabela tiver outro nome
// ============================================================

const SUPABASE_URL = "https://yhuttwgufaiyzzeijkpx.supabase.co/rest/v1/";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlodXR0d2d1ZmFpeXp6ZWlqa3B4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4NTg2NjYsImV4cCI6MjEwMTQzNDY2Nn0.4jasxJw0wKz1za4ydoMTeq27HZw2WBqHzDUusUgK_LY";
const TABLE_NAME = "movimentacoes";
