import { operatorAuth,type Bindings } from '../auth.server'
/** Promote and demote in one audited transaction. Native version and last-owner
 * triggers remain authoritative; no copied Base authentication code is changed. */
export async function transferOwnership(env:Bindings,request:Request,input:Record<string,unknown>){
 if(input.confirm!=='transfer-ownership')throw Error('Confirm transfer-ownership explicitly.')
 const session=await operatorAuth(env).requireStepUp(request,'owner:transfer'),actor=session.operator
 if(actor.role!=='owner')throw Error('Only the current owner can transfer ownership.')
 const target=await env.DB.prepare("SELECT id,email,version FROM oa_operators WHERE id=? AND id!=? AND role!='owner' AND status='active' AND NOT EXISTS(SELECT 1 FROM pane_anonymized_people WHERE id=oa_operators.id)").bind(String(input.operatorId??''),actor.id).first<{id:string;email:string;version:number}>()
 if(!target||String(input.email??'').trim().toLowerCase()!==target.email.toLowerCase())throw Error('Choose an admitted business user and confirm their email address.')
 await env.DB.batch([
  env.DB.prepare(`UPDATE pane_audit_context SET valid=CASE WHEN EXISTS(SELECT 1 FROM oa_operators WHERE id=? AND role='owner' AND status='active' AND version=?) AND EXISTS(SELECT 1 FROM oa_operators WHERE id=? AND role!='owner' AND status='active' AND version=?) THEN 1 ELSE 0 END WHERE id=1`).bind(actor.id,actor.version,target.id,target.version),
  env.DB.prepare("UPDATE oa_operators SET role='owner' WHERE id=?").bind(target.id),
  env.DB.prepare('DELETE FROM pane_roles WHERE operator_id=?').bind(target.id),
  env.DB.prepare('INSERT INTO pane_roles(operator_id,roles,changed_by,changed_at) VALUES(?,?,?,?) ON CONFLICT(operator_id) DO UPDATE SET roles=excluded.roles,changed_by=excluded.changed_by,changed_at=excluded.changed_at').bind(actor.id,JSON.stringify(['editor']),target.id,Date.now()),
  env.DB.prepare("UPDATE oa_operators SET role='member' WHERE id=?").bind(actor.id),
  env.DB.prepare('UPDATE pane_api_tokens SET revoked_at=COALESCE(revoked_at,?) WHERE operator_id IN (?,?)').bind(Date.now(),actor.id,target.id),
 ])
 return {owner:target.id,designer:actor.id,designerRoles:['editor'],signInAgain:true}
}
export async function revokeContributor(env:Bindings,request:Request,input:Record<string,unknown>){
 if(input.confirm!=='revoke-access')throw Error('Confirm revoke-access explicitly.')
 const target=await env.DB.prepare("SELECT id FROM oa_operators WHERE id=? AND role!='owner' AND status='active'").bind(String(input.operatorId??'')).first()
 if(!target)throw Error('Choose an active contributor.')
 await operatorAuth(env).setOperatorStatus(request,String(target.id),'inactive')
 return {revoked:target.id}
}
