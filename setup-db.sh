#!/bin/bash

echo "Setting up database..."

# Create database and grant privileges
psql -U postgres -c "CREATE DATABASE uba_mvp_db;"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE uba_mvp_db TO postgres;"
psql -U postgres -c "\c uba_mvp_db"

# Enable pgcrypto and run schema
psql -U postgres -d uba_mvp_db -c "CREATE EXTENSION IF NOT EXISTS \"pgcrypto\";"
psql -U postgres -d uba_mvp_db -f sql_stuff/schema.sql

echo "Database setup complete!"

#Code to Run
#./setup-db.sh