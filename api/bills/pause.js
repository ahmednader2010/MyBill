import {db,scheduler} from "hatchable";
export const access="user"; export const methods=["POST"];
export default async function(req,res){
 const{id,paused}=req.body||{}; if(!id)return res.status(400).json({error:"Bill id is required."});
 const old=(await db.query("SELECT id,status,paused_at,reminder_task_id,payment_task_id FROM bills WHERE id=$1 AND user_id=$2",[id,req.user.id])).rows[0];
 if(!old)return res.status(404).json({error:"Bill not found."});
 if(paused===true){
   if(old.status==="paused")return res.json({ok:true,status:"paused"});
   if(old.reminder_task_id)try{await scheduler.cancel(old.reminder_task_id)}catch{}
   if(old.payment_task_id&&old.payment_task_id!==old.reminder_task_id)try{await scheduler.cancel(old.payment_task_id)}catch{}
   await db.query("UPDATE bills SET status='paused',paused_at=NOW(),reminder_task_id=NULL,payment_task_id=NULL,updated_at=NOW() WHERE id=$1 AND user_id=$2",[id,req.user.id]);
   return res.json({ok:true,status:"paused"});
 }
 if(old.status!=="paused"||!old.paused_at)return res.json({ok:true,status:"active"});
 const daysRow=await db.query("SELECT GREATEST(0,(CURRENT_DATE - paused_at::date))::int AS days FROM bills WHERE id=$1 AND user_id=$2",[id,req.user.id]);
 const days=Number(daysRow.rows[0]?.days||0);
 const{rows}=await db.query("UPDATE bills SET due_date=due_date + $1 * INTERVAL '1 day',status='active',paused_at=NULL,updated_at=NOW() WHERE id=$2 AND user_id=$3 RETURNING id,due_date,end_date,reminder_enabled,frequency",[days,id,req.user.id]);
 const bill=rows[0];
 if(bill.reminder_enabled&&bill.frequency!=="one_time"&&(!bill.end_date||bill.due_date<=bill.end_date)){
   const[y,m,d]=bill.due_date.split("-").map(Number);const when0=new Date(Date.UTC(y,m-1,d,9)-86400000);const when=when0>new Date()?when0:new Date(Date.now()+60000);
   const task=await scheduler.at(when,"/api/reminders/send",{payload:{billId:id},name:"bill-reminder-"+id});await db.query("UPDATE bills SET reminder_task_id=$1,payment_task_id=$1 WHERE id=$2",[task.id,id]);
 }
 res.json({ok:true,status:"active",paused_days:days,bill});
}