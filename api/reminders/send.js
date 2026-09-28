import {db,email,events,scheduler,config} from "hatchable";
export const access="scheduler";export const methods=["POST"];
const dueAt=s=>{const[y,m,d]=s.split("-").map(Number);return new Date(Date.UTC(y,m-1,d,9))};
const tomorrowAt9=()=>{const d=new Date();d.setUTCDate(d.getUTCDate()+1);d.setUTCHours(9,0,0,0);return d};
export default async function(req,res){
 const id=req.body?.billId;if(!id)return res.status(400).json({error:"billId is required"});
 const{rows}=await db.query("SELECT id,user_id,name,amount,currency,due_date,end_date,status,reminder_enabled,reminder_email,payment_status FROM bills WHERE id=$1",[id]);const b=rows[0];
 if(!b||!b.reminder_enabled||b.status!=="active")return res.json({ok:true,skipped:true});
 if(b.end_date&&b.due_date>b.end_date)return res.json({ok:true,skipped:true,ended:true});
 await db.query("UPDATE bills SET payment_status='unpaid',remind_at=NULL,payment_task_id=NULL,reminder_task_id=NULL,updated_at=NOW() WHERE id=$1",[id]);
 if(b.reminder_email)await email.send({to:b.reminder_email,subject:"MyBill: did you pay "+b.name+"?",text:"Your bill "+b.name+" is due on "+b.due_date+". Open MyBill to mark it Paid or choose a reminder for later.",html:"<p><strong>MyBill payment check</strong></p><p><strong>"+b.name+"</strong> is due on <strong>"+b.due_date+"</strong>.</p><p>Open MyBill to choose <strong>Paid</strong> or <strong>Remind me later</strong>.</p>"});
 const apiKey=await config.get("ONESIGNAL_API_KEY"),appId=await config.get("ONESIGNAL_APP_ID");
 if(apiKey&&appId&&b.user_id)try{await fetch("https://api.onesignal.com/notifications",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Key "+apiKey},body:JSON.stringify({app_id:appId,target_channel:"push",include_aliases:{external_id:[String(b.user_id)]},headings:{en:"MyBill: did you pay?"},contents:{en:b.name+" is due on "+b.due_date+". Mark it paid or remind yourself later."},url:"https://mybill.hatchable.site/"})})}catch{}
 // The first reminder is 24 hours before the due date. If it is still unpaid,
 // continue asking once per day starting the day after the due date. A manual
 // "Remind me in X days" replaces this task and the daily chain resumes after it fires.
 try{
  const next=tomorrowAt9();
  if(!b.end_date||next<=dueAt(b.end_date)){const task=await scheduler.at(next,"/api/reminders/send",{payload:{billId:b.id},name:"bill-reminder-"+b.id});await db.query("UPDATE bills SET reminder_task_id=$1,payment_task_id=$1,updated_at=NOW() WHERE id=$2",[task.id,b.id]);}
 }catch{}
 try{await events.publish("bills","payment_check",{billId:b.id,name:b.name,due_date:b.due_date})}catch{}
 res.json({ok:true,reminded:true,payment_check:true});
}