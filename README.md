# unifiedbadmintonapp-v1-mvp

please don't push to main, use branches and merge instead
to disable local pushing to main:
`git config --global  branch.main.pushRemote no_push`

NEVER TOUCH PRODUCTION, THIS SHOULD ONLY BE CHANGED WITH MERGES, IT IS WHAT RENDER PULLS FROM

git workflow:
create issue (will have a number)
create branch named dev/issue_number/description_if_wanted
create pull request when implemented
merge branch to main when ready
 
FRONTEND/BACKEND:
- to compile:
`npm run build`

- to run:
`npm run dev`


WSL password: 07072003
Database:
- to start database:
`sudo service postgresql start`
- to check if database is active:
`sudo -u postgres psql`
- database modifications:
    - open wsl, switch to user
    `sudo -i -u postgres` (note password is 07072003)
    - command to go into database:
    `psql`
- database env file: `backend\db.env``

Clear database instructions:
- Connect to PostgreSQL as the postgres user (or your admin user) using psql in WSL: 
`sudo -u postgres psql`
- Drop the database: 
`DROP DATABASE uba_mvp_db;`
- Recreate the database: 
`CREATE DATABASE uba_mvp_db;`
- Grant privileges again: 
`GRANT ALL PRIVILEGES ON DATABASE uba_mvp_db TO postgres;`
- Connect to the new DB: 
`\c uba_mvp_db`
- Enable crypto: 
`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`
- Exit psql: 
`\q`
- switch to postgres user
`sudo -i -u postgres` (note password is 07072003)
- Run the full updated schema script: 
`psql uba_mvp_db -f /mnt/c/Users/zanza/githubStuff/unifiedbadmintonapp-v1-mvp/sql_stuff/schema.sql`





// command to populate new render database
psql "COPY FROM RENDER EXTERNAL DATABASE URL" -f /mnt/c/Users/zanza/githubStuff/unifiedbadmintonapp-v1-mvp/sql_stuff/schema.sql