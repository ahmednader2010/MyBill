import {db,scheduler} from "hatchable";
export const access="user"; export const methods=["DELETE"];
export default async function(req,res){
 const id=req.body?.id;if(!id)return res.status(400).json({error:"Bill id is required."});
 const old=(await db.query("SELECT reminder_task_id FROM bills WHERE id=$1 AND user_id=$2",[id,req.user.id])).rows[0];if(old?.reminder_task_id)try{await scheduler.cancel(old.reminder_task_id)}catch{}
 await db.query("DELETE FROM bill_sessions WHERE bill_id=$1 AND user_id=$2",[id,req.user.id]);await db.query("DELETE FROM bills WHERE id=$1 AND user_id=$2",[id,req.user.id]);res.json({ok:true});
}