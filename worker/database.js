export function database(env){
 if(!env.DB)throw new Error('Leaderboard database is unavailable');
 return env.DB;
}
export async function publicPlayer(db,row){
 if(!row)return null;
 const rank=row.best>0?await db.prepare('SELECT COUNT(*) + 1 AS rank FROM players WHERE best > ? OR (best = ? AND (updated_at < ? OR (updated_at = ? AND id < ?)))').bind(row.best,row.best,row.updated_at,row.updated_at,row.id).first():null;
 return {id:row.id,name:row.name,best:row.best,rank:rank?.rank??null};
}
