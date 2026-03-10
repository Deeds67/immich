import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('shared_space_activity')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('spaceId', 'uuid', (col) => col.notNull().references('shared_space.id').onDelete('cascade'))
    .addColumn('userId', 'uuid', (col) => col.references('user.id').onDelete('set null'))
    .addColumn('type', 'varchar(30)', (col) => col.notNull())
    .addColumn('data', 'jsonb', (col) => col.notNull().defaultTo(sql`'{}'::jsonb`))
    .addColumn('createdAt', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema
    .createIndex('shared_space_activity_spaceId_createdAt_idx')
    .on('shared_space_activity')
    .columns(['spaceId', 'createdAt'])
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropIndex('shared_space_activity_spaceId_createdAt_idx').execute();
  await db.schema.dropTable('shared_space_activity').execute();
}
