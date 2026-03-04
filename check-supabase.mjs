/**
 * Script para crear la tabla profiles y luego insertar el usuario de prueba
 * Ejecutar con: npx tsx scripts/setup-and-create-user.mjs
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://cbvzkfqikwqddcdwmbos.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNidnprZnFpa3dxZGRjZHdtYm9zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTIxNzU0OSwiZXhwIjoyMDgwNzkzNTQ5fQ.N-YWBnFp-8xxAflAaIyhcTMydDe2VYSjYWiGNW2eyY8'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
})

async function listTables() {
    console.log('🔍 Listando tablas existentes...')

    const { data, error } = await supabase.rpc('pg_tables_list').maybeSingle()

    // Fallback: just try to select from profiles
    const { data: profilesCheck, error: profilesError } = await supabase
        .from('profiles')
        .select('id')
        .limit(1)

    if (profilesError) {
        console.log(`⚠️  Tabla 'profiles': ${profilesError.message}`)
    } else {
        console.log(`✅ Tabla 'profiles' existe. Registros: ${profilesCheck?.length || 0}`)
    }

    // Check for user_profiles view
    const { data: viewCheck, error: viewError } = await supabase
        .from('user_profiles')
        .select('id')
        .limit(1)

    if (viewError) {
        console.log(`⚠️  Tabla/vista 'user_profiles': ${viewError.message}`)
    } else {
        console.log(`✅ Tabla/vista 'user_profiles' existe. Registros: ${viewCheck?.length || 0}`)
    }

    // List all available tables via information_schema
    const { data: tables, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name')

    // Try raw SQL
    const { data: rawTables, error: rawError } = await supabase.rpc('get_public_tables')

    if (rawTables) {
        console.log('📋 Tablas públicas:', rawTables)
    }

    // Try to list existing auth users
    console.log('\n🔍 Listando usuarios auth existentes...')
    const { data: usersData } = await supabase.auth.admin.listUsers()
    if (usersData?.users) {
        console.log(`👥 ${usersData.users.length} usuarios encontrados:`)
        usersData.users.forEach(u => {
            console.log(`   - ${u.email} (${u.id}) created: ${u.created_at}`)
        })
    }
}

async function createTestProfile() {
    const testEmail = 'test@almuerzo.cl'
    const userId = '1152e870-dba4-4f45-bf9e-84a48e1230dd' // Ya creado

    // Try inserting directly
    console.log('\n🔄 Intentando insertar perfil...')
    const { data, error } = await supabase
        .from('profiles')
        .upsert({
            id: userId,
            email: testEmail,
            first_name: 'Usuario',
            last_name: 'Demo',
            display_name: 'Demo Almuerzo',
            phone: '+56912345678',
            phone_number: '+56912345678',
            role: 'user',
            account_type: 'elite',
            reservation_reputation: 95,
            takeaway_reputation: 88,
        }, { onConflict: 'id' })

    if (error) {
        console.error('❌ Error:', error.message)
        console.log('\n💡 La tabla profiles probablemente no existe.')
        console.log('   Ve a Supabase Dashboard → SQL Editor y ejecuta el schema init_schema_v5.sql')
    } else {
        console.log('✅ Perfil creado correctamente!')
        console.log('')
        console.log('═══════════════════════════════════════════')
        console.log('  🎉 USUARIO DE PRUEBA LISTO')
        console.log('═══════════════════════════════════════════')
        console.log(`  📧 Email:    ${testEmail}`)
        console.log(`  🔑 Password: almuerzo2026`)
        console.log(`  🆔 UUID:     ${userId}`)
        console.log('═══════════════════════════════════════════')
    }
}

await listTables()
await createTestProfile()
