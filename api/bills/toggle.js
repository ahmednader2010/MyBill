import {db,scheduler} from "hatchable";
const reminderAt=s=>{const[y,m,d]=s.split("-").map(Number);const when=new Date(Date.UTC(y,m-1,d,9)-86400000);return when>new Date()?when:new Date(Date.now()+60000)};
export const access="user"; export const methods=["POST"];
export default async function(req,res){
 const{id,enabled}=req.body||{}; if(!id)return res.status(400).json({error:"Bill id is required."});
 const old=(await db.query("SELECT reminder_task_id FROM bills WHERE id=$1 AND user_id=$2",[id,req.user.id])).rows[0]; if(!old)return res.status(404).json({error:"Bill not found."});
 if(enabled===false&&old.reminder_task_id)try{await scheduler.cancel(old.reminder_task_id)}catch{}
 const {rows}=await db.query("UPDATE bills SET reminder_enabled=$1,reminder_task_id=NULL,updated_at=NOW() WHERE id=$2 AND user_id=$3 RETURNING id,reminder_enabled,due_date,frequency,status,end_date",[enabled!==false,id,req.user.id]);
 const bill=rows[0];
 if(bill?.reminder_enabled&&bill.status==="active"&&bill.frequency!=="one_time"&&bill.frequency!=="session_based"&&(!bill.end_date||bill.due_date<=bill.end_date)){const task=await scheduler.at(reminderAt(bill.due_date),"/api/reminders/send",{payload:{billId:id},name:"bill-reminder-"+id});await db.query("UPDATE bills SET reminder_task_id=$1,payment_task_id=$1 WHERE id=$2 AND user_id=$3",[task.id,id,req.user.id]);}
 res.json({bill});
}