declare module '@runeditrun/rer/internal/modules/portability/journal.mjs' {
 export function erasureStatements(db: D1Database,table:string,key:Record<string,unknown>):Promise<D1PreparedStatement[]>
 export function invalidateTransfersStatements(db:D1Database):Promise<D1PreparedStatement[]>
}
