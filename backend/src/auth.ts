import { createClient } from '@supabase/supabase-js';
import type { Request, Response, NextFunction } from 'express';
import { config, local } from './config.ts';
import { pool } from './db.ts';
export const supabase=config.SUPABASE_URL&&config.SUPABASE_SECRET_KEY?createClient(config.SUPABASE_URL,config.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}}):null;
export type Context={userId:string;orgId:string;role:'admin'|'reviewer'|'viewer'};
declare global {namespace Express {interface Request {userId:string;context:Context;}}}
export class HttpError extends Error {constructor(public status:number,message:string){super(message);}}
export async function authenticate(req:Request,_res:Response,next:NextFunction) {
  try {
    if(local){req.userId=config.LOCAL_USER_ID;return next();}
    const token=req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];if(!token)throw new HttpError(401,'Sign in to continue');
    const {data,error}=await supabase!.auth.getUser(token);if(error||!data.user)throw new HttpError(401,'Session expired or invalid');
    req.userId=data.user.id;next();
  } catch(error){next(error);}
}
export async function tenant(req:Request,_res:Response,next:NextFunction) {
  try {
    const orgId=local?config.LOCAL_ORG_ID:req.get('X-Organization-ID');
    if(!orgId||!/^[a-f0-9-]{36}$/i.test(orgId))throw new HttpError(400,'Choose an organization');
    const result=await pool.query('SELECT role FROM memberships WHERE user_id=$1 AND org_id=$2',[req.userId,orgId]);
    if(!result.rowCount)throw new HttpError(403,'Organization access denied');
    req.context={orgId,userId:req.userId,role:result.rows[0].role};next();
  } catch(error){next(error);}
}
export function writable(context:Context){if(context.role==='viewer')throw new HttpError(403,'Reviewer access required');}
export function admin(context:Context){if(context.role!=='admin')throw new HttpError(403,'Administrator access required');}
