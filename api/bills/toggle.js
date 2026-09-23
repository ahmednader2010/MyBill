import {db,scheduler} from "hatchable";
export const access="user"; export const methods=["POST"];
export default async function(req,res){
 const{id,enabled}=req.body||{}; if(!id)return res.status(400).json({error:"Bill id is required."});
 const old=(await db.query("SELECT reminder_task_id FROM bills WHERE id=$1 AND user_id=$2",[id,req.user.id])).rows[0]; if(!old)return res.status(404).json({error:"Bill not found."});
 if(enabled===false&&old.reminder_task_id)try{await scheduler.cancel(old.reminder_task_id)}catch{}
 const {rows}=await db.query("UPDATE bills SET reminder_enabled=$1,reminder_task_id=NULL,updated_at=NOW() WHERE id=$2 AND user_id=$3 RETURNING id,reminder_enabled,due_date,frequency",[enabled!==false,id,req.user.id]);
 res.json({bill:rows[0]});
}