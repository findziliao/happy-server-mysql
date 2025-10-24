# MySQL Migrations

This folder contains a hand-crafted initial MySQL migration matching the current Prisma schema.

Apply it to an empty `handy` database:

- Start MySQL locally (example):
  - `yarn db:mysql` (root/root on 127.0.0.1:3306, DB: handy)
- Apply SQL:
  - `mysql -h 127.0.0.1 -P 3306 -uroot -proot handy < prisma/migrations_mysql/20251021095200_init_mysql/migration.sql`

Notes
- The canonical `prisma/migrations` directory is PostgreSQL history. For MySQL, prefer `prisma db push` or this SQL.
- You can also sync schema without SQL via: `yarn migrate:mysql`.
