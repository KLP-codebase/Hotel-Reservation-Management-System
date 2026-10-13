#!/usr/bin/env bash
set -e

echo "========================================="
echo " Sky Nest Hotel — PostgreSQL Setup Script"
echo "========================================="

# Step 1: Install PostgreSQL if not installed
if ! command -v psql &> /dev/null; then
    echo "Installing PostgreSQL packages..."
    apt-get update
    apt-get install -y postgresql postgresql-contrib
else
    echo "PostgreSQL client/server packages detected."
fi

# Step 2: Ensure PostgreSQL service is running
echo "Starting PostgreSQL service..."
service postgresql start || systemctl start postgresql || true

# Step 3: Configure postgres user password and create database
echo "Configuring PostgreSQL user and database..."
su - postgres -c "psql -c \"ALTER USER postgres WITH PASSWORD 'password';\"" || true
su - postgres -c "psql -c \"CREATE DATABASE skynest;\"" 2>/dev/null || echo "Database 'skynest' already exists."

# Step 4: Enable uuid-ossp extension
su - postgres -c "psql -d skynest -c 'CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";'"

# Step 5: Run DDL schema and migration scripts
echo "Applying database schema & migrations..."
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"

su - postgres -c "psql -d skynest -f '$REPO_DIR/database/schema.sql'"
su - postgres -c "psql -d skynest -f '$REPO_DIR/database/migrations/001_create_branches.sql'"
su - postgres -c "psql -d skynest -f '$REPO_DIR/database/migrations/002_create_staff_user_accounts.sql'"
su - postgres -c "psql -d skynest -f '$REPO_DIR/database/migrations/003_update_rooms_branch_fk.sql'"
su - postgres -c "psql -d skynest -f '$REPO_DIR/database/migrations/004_create_audit_logs.sql'"
su - postgres -c "psql -d skynest -f '$REPO_DIR/database/migrations/005_triggers.sql'"
su - postgres -c "psql -d skynest -f '$REPO_DIR/database/migrations/006_views.sql'"
su - postgres -c "psql -d skynest -f '$REPO_DIR/database/migrations/007_functions.sql'"
su - postgres -c "psql -d skynest -f '$REPO_DIR/database/migrations/008a_indexes.sql'"

echo "========================================="
echo "✅ PostgreSQL Setup & Seeding Complete!"
echo "Database 'skynest' ready on port 5432."
echo "Admin Account: admin / admin2025"
echo "========================================="
