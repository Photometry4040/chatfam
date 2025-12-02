import { drizzle } from 'drizzle-orm/neon-serverless';
import { sql } from 'drizzle-orm';
import { Pool } from '@neondatabase/serverless';

// This assumes DATABASE_URL is set to your Supabase connection string
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

const pool = new Pool({ connectionString });
const db = drizzle(pool);

async function analyzeDatabase() {
  try {
    console.log('=== DATABASE STRUCTURE ANALYSIS ===\n');

    // 1. List all tables in public schema
    console.log('1. LISTING ALL TABLES IN PUBLIC SCHEMA');
    console.log('=====================================\n');

    const tables = await db.execute(sql`
      SELECT
        table_name,
        table_type
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log('Tables found:', tables.rows.length);
    tables.rows.forEach((row: any) => {
      console.log(`  - ${row.table_name} (${row.table_type})`);
    });

    // 2. Get detailed schema for each table
    console.log('\n\n2. DETAILED SCHEMA FOR EACH TABLE');
    console.log('===================================\n');

    for (const table of tables.rows) {
      const tableName = (table as any).table_name;

      console.log(`\n--- TABLE: ${tableName} ---`);

      // Get columns
      const columns = await db.execute(sql`
        SELECT
          column_name,
          data_type,
          character_maximum_length,
          column_default,
          is_nullable,
          udt_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = ${tableName}
        ORDER BY ordinal_position;
      `);

      console.log('\nColumns:');
      columns.rows.forEach((col: any) => {
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
        const length = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
        console.log(`  - ${col.column_name}: ${col.data_type}${length} ${nullable}${defaultVal}`);
      });

      // Get primary keys
      const pks = await db.execute(sql`
        SELECT a.attname
        FROM pg_index i
        JOIN pg_attribute a ON a.attrelid = i.indrelid
          AND a.attnum = ANY(i.indkey)
        WHERE i.indrelid = ${tableName}::regclass
          AND i.indisprimary;
      `);

      if (pks.rows.length > 0) {
        console.log('\nPrimary Keys:');
        pks.rows.forEach((pk: any) => {
          console.log(`  - ${pk.attname}`);
        });
      }

      // Get foreign keys
      const fks = await db.execute(sql`
        SELECT
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name,
          rc.update_rule,
          rc.delete_rule
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        JOIN information_schema.referential_constraints AS rc
          ON rc.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
          AND tc.table_name = ${tableName};
      `);

      if (fks.rows.length > 0) {
        console.log('\nForeign Keys:');
        fks.rows.forEach((fk: any) => {
          console.log(`  - ${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`);
          console.log(`    ON UPDATE ${fk.update_rule}, ON DELETE ${fk.delete_rule}`);
        });
      }

      // Get indexes
      const indexes = await db.execute(sql`
        SELECT
          i.relname AS index_name,
          a.attname AS column_name,
          ix.indisunique AS is_unique,
          ix.indisprimary AS is_primary
        FROM pg_class t
        JOIN pg_index ix ON t.oid = ix.indrelid
        JOIN pg_class i ON i.oid = ix.indexrelid
        JOIN pg_attribute a ON a.attrelid = t.oid
          AND a.attnum = ANY(ix.indkey)
        WHERE t.relname = ${tableName}
          AND t.relkind = 'r'
        ORDER BY i.relname;
      `);

      if (indexes.rows.length > 0) {
        console.log('\nIndexes:');
        const indexMap = new Map();
        indexes.rows.forEach((idx: any) => {
          if (!indexMap.has(idx.index_name)) {
            indexMap.set(idx.index_name, {
              columns: [],
              is_unique: idx.is_unique,
              is_primary: idx.is_primary
            });
          }
          indexMap.get(idx.index_name).columns.push(idx.column_name);
        });

        indexMap.forEach((info, name) => {
          const type = info.is_primary ? 'PRIMARY KEY' : (info.is_unique ? 'UNIQUE' : 'INDEX');
          console.log(`  - ${name} (${type}) on (${info.columns.join(', ')})`);
        });
      }

      // Get row count
      const count = await db.execute(sql.raw(`SELECT COUNT(*) as count FROM "${tableName}"`));
      console.log(`\nRow count: ${(count.rows[0] as any).count}`);
    }

    // 3. Check RLS status
    console.log('\n\n3. ROW-LEVEL SECURITY (RLS) STATUS');
    console.log('====================================\n');

    const rlsTables = await db.execute(sql`
      SELECT
        schemaname,
        tablename,
        rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);

    rlsTables.rows.forEach((row: any) => {
      const status = row.rowsecurity ? 'ENABLED' : 'DISABLED';
      console.log(`  - ${row.tablename}: RLS ${status}`);
    });

    // Get RLS policies
    console.log('\n\nRLS Policies:');
    const policies = await db.execute(sql`
      SELECT
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual,
        with_check
      FROM pg_policies
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname;
    `);

    if (policies.rows.length === 0) {
      console.log('  No RLS policies found');
    } else {
      policies.rows.forEach((policy: any) => {
        console.log(`\n  Table: ${policy.tablename}`);
        console.log(`  Policy: ${policy.policyname}`);
        console.log(`  Type: ${policy.permissive}`);
        console.log(`  Command: ${policy.cmd}`);
        console.log(`  Roles: ${policy.roles.join(', ')}`);
        if (policy.qual) console.log(`  USING: ${policy.qual}`);
        if (policy.with_check) console.log(`  WITH CHECK: ${policy.with_check}`);
      });
    }

    // 4. Check for Supabase auth tables
    console.log('\n\n4. SUPABASE AUTH TABLES');
    console.log('========================\n');

    const authTables = await db.execute(sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'auth'
      ORDER BY table_name;
    `);

    if (authTables.rows.length === 0) {
      console.log('  No auth schema tables found');
    } else {
      console.log('Auth tables found:');
      authTables.rows.forEach((row: any) => {
        console.log(`  - auth.${row.table_name}`);
      });
    }

    // 5. Check storage buckets
    console.log('\n\n5. SUPABASE STORAGE BUCKETS');
    console.log('=============================\n');

    const buckets = await db.execute(sql`
      SELECT
        id,
        name,
        public
      FROM storage.buckets
      ORDER BY name;
    `).catch(() => ({ rows: [] }));

    if (buckets.rows.length === 0) {
      console.log('  No storage buckets found (or storage schema not accessible)');
    } else {
      console.log('Storage buckets:');
      buckets.rows.forEach((row: any) => {
        const visibility = row.public ? 'PUBLIC' : 'PRIVATE';
        console.log(`  - ${row.name} (${visibility})`);
      });
    }

    // 6. Check for realtime configuration
    console.log('\n\n6. REALTIME CONFIGURATION');
    console.log('==========================\n');

    const realtimeTables = await db.execute(sql`
      SELECT
        schemaname,
        tablename
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
      ORDER BY tablename;
    `).catch(() => ({ rows: [] }));

    if (realtimeTables.rows.length === 0) {
      console.log('  No tables configured for realtime (or realtime publication not found)');
    } else {
      console.log('Tables enabled for realtime:');
      realtimeTables.rows.forEach((row: any) => {
        console.log(`  - ${row.schemaname}.${row.tablename}`);
      });
    }

    // 7. List all schemas
    console.log('\n\n7. ALL SCHEMAS IN DATABASE');
    console.log('===========================\n');

    const schemas = await db.execute(sql`
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name NOT IN ('pg_catalog', 'information_schema')
      ORDER BY schema_name;
    `);

    schemas.rows.forEach((row: any) => {
      console.log(`  - ${row.schema_name}`);
    });

    console.log('\n\n=== ANALYSIS COMPLETE ===\n');

  } catch (error) {
    console.error('Error analyzing database:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

analyzeDatabase().catch(console.error);
