import {sqliteTable,text,integer,index,uniqueIndex} from 'drizzle-orm/sqlite-core';
import {desc} from 'drizzle-orm';
export const players=sqliteTable('players',{
 id:text('id').primaryKey(),
 tokenHash:text('token_hash').notNull(),
 name:text('name').notNull(),
 best:integer('best').notNull().default(0),
 updatedAt:integer('updated_at').notNull(),
 createdAt:integer('created_at').notNull(),
},t=>[uniqueIndex('players_token_hash_unique').on(t.tokenHash),index('players_ranking').on(desc(t.best),t.updatedAt,t.id)]);
