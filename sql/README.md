# SQL Files Organization

This directory contains all SQL scripts for the Supabase database setup, organized by purpose.

## Structure

```
sql/
├── schema/      # Core database structure (required)
├── functions/   # RPC functions for features (required)
└── seeds/       # Demo/test data (optional)
```

## Setup Order

### 1. Production Setup (Required)

Run these in order in your Supabase SQL Editor:

1. **Schema files** (creates tables and RLS policies):
   ```sql
   -- Run each file in order:
   sql/schema/01-profiles-table.sql
   sql/schema/02-entitlements-table.sql
   sql/schema/03-lesson-progress-table.sql
   ```

2. **Function files** (creates RPC functions):
   ```sql
   sql/functions/profiles-directory.sql
   ```

### 2. Demo Setup (Optional)

For demo/development environments, also run:

```sql
sql/seeds/demo-profiles.sql
```

This adds sample data with realistic profiles for testing.

## File Purposes

### Schema Files (`/schema`)
- **01-profiles-table.sql** - User profiles table with RLS policies
- **02-entitlements-table.sql** - Course access control
- **03-lesson-progress-table.sql** - Lesson completion tracking

### Function Files (`/functions`)
- **profiles-directory.sql** - Public RPC functions for viewing profiles without exposing emails

### Seed Files (`/seeds`)
- **demo-profiles.sql** - Adds profile fields and populates with realistic demo data

## Important Notes

1. **Order matters** - Run schema files in numbered order
2. **RLS is enabled** - All tables have Row Level Security
3. **Functions are public** - The `_public` suffix functions work for anonymous users
4. **Seeds are optional** - Only use seed data in development/demo environments

## Quick Start

For a complete setup with demo data:

```bash
# In Supabase SQL Editor, run in this order:
1. All files in sql/schema/ (in numbered order)
2. All files in sql/functions/
3. (Optional) All files in sql/seeds/ for demo data
```

## Troubleshooting

- **Permission denied**: Make sure you're running as the postgres user
- **Table already exists**: Safe to ignore, scripts use IF NOT EXISTS
- **Function already exists**: The CREATE OR REPLACE handles updates
- **RLS blocking access**: Check that policies match your auth.uid()