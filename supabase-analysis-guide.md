# Supabase Database Analysis Guide for FamilyChatter

## Current Status

Your FamilyChatter project has:
- **Project Reference**: `gqvyzqodyspvwlwfjmfg`
- **MCP Configuration**: Already set up in `.mcp.json` (needs authentication)
- **Current Database**: Using Neon Database with Drizzle ORM
- **Existing Tables**: Only `users` table defined in schema

## Option 1: Use the Analysis Script (Recommended)

I've created an analysis script at `/Users/jueunlee/project/FamilyChatter/analyze-db.ts` that will comprehensively analyze your Supabase database.

### Steps to Run:

1. **Get your Supabase connection string**:
   - Visit: https://supabase.com/dashboard/project/gqvyzqodyspvwlwfjmfg/settings/database
   - Copy the "Connection string" (Postgres format)
   - It should look like: `postgresql://postgres:[YOUR-PASSWORD]@db.gqvyzqodyspvwlwfjmfg.supabase.co:5432/postgres`

2. **Set the DATABASE_URL**:
   ```bash
   export DATABASE_URL='your-connection-string-here'
   ```

3. **Run the analysis**:
   ```bash
   cd /Users/jueunlee/project/FamilyChatter
   tsx analyze-db.ts
   ```

## Option 2: Use Supabase CLI

If you have the Supabase CLI installed:

```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref gqvyzqodyspvwlwfjmfg

# Inspect database
supabase db inspect

# Get database structure
supabase db dump --data-only
```

## Option 3: Manual Query via Supabase Dashboard

Visit your SQL Editor:
https://supabase.com/dashboard/project/gqvyzqodyspvwlwfjmfg/sql

Run these queries:

### 1. List All Tables
```sql
SELECT
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

### 2. Get Table Schema
```sql
SELECT
  table_name,
  column_name,
  data_type,
  character_maximum_length,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
```

### 3. Get Primary Keys
```sql
SELECT
  tc.table_name,
  kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'PRIMARY KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;
```

### 4. Get Foreign Keys
```sql
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.update_rule,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;
```

### 5. Check RLS Status
```sql
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

### 6. Get RLS Policies
```sql
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
```

### 7. Check Auth Tables
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'auth'
ORDER BY table_name;
```

### 8. Check Storage Buckets
```sql
SELECT id, name, public
FROM storage.buckets
ORDER BY name;
```

### 9. Check Realtime Configuration
```sql
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;
```

### 10. Get Row Counts
```sql
SELECT
  schemaname,
  tablename,
  n_live_tup AS row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

## What the Analysis Will Tell Us

The analysis will provide:

1. **Complete table listing** - All tables in the public schema
2. **Full schema details** - Columns, types, constraints, defaults
3. **Relationships** - Primary keys, foreign keys, indexes
4. **RLS configuration** - Which tables have RLS enabled and what policies exist
5. **Auth integration** - Supabase auth schema tables
6. **Storage setup** - Any configured storage buckets
7. **Realtime status** - Tables enabled for realtime subscriptions
8. **Data volume** - Row counts for each table
9. **Naming conventions** - Existing patterns to follow

## Current FamilyChatter Schema

Your current local schema (from `shared/schema.ts`) only has:

- **users** table:
  - id (varchar, PK, UUID)
  - username (text, unique, not null)
  - password (text, not null)

The following are defined as TypeScript interfaces but NOT as database tables:
- FamilyMember
- Message
- FamilyGroup

## Next Steps

1. Run the analysis to see what exists in your Supabase database
2. Compare with your current schema
3. Design new tables to integrate with existing structure
4. Ensure no naming conflicts
5. Plan migration strategy

Once you provide the DATABASE_URL or run the queries manually, share the results and I can provide a comprehensive integration plan.
