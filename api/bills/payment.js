import {db,scheduler} from "hatchable";
export const access="user"; export const methods=["POST"];
function addMonthsClamped(s,months){const[y,m,d]=s.split("-").map(Number),x=new Date(Date.UTC(y,m-1+months,1)),last=new Date(Date.UTC(x.getUTCFullYear(),x.getUTCMonth()+1,0)).getUTCDate();return new Date(Date.UTC(x.getUTCFullYear(),x.getUTCMonth(),Math.min(d,last)))}
function nextDue(b){let x;if(b.frequency==="monthly")x=addMonthsClamped(b.due_date,1);else if(b.frequency==="quarterly")x=addMonthsClamped(b.due_date,3);else if(b.frequency==="yearly")x=addMonthsClamped(b.due_date,12);else{const[y,m,d]=b.due_date.split("-").map(Number);x=new Date(Date.UTC(y,m-1,d));if(b.frequency==="weekly")x.setUTCDate(x.getUTCDate()+7);else if(b.frequency==="custom")x.setUTCDate(x.getUTCDate()+Number(b.interval_days));else return x;}const today=new Date();today.setUTCHours(0,0,0,0);let guard=0;while(x<=today&&guard++<1000){const s=x.toISOString().slice(0,10);if(b.frequency==="monthly")x=addMonthsClamped(s,1);else if(b.frequency==="quarterly")x=addMonthsClamped(s,3);else if(b.frequency==="yearly")x=addMonthsClamped(s,12);else if(b.frequency==="weekly")x.setUTCDate(x.getUTCDate()+7);else x.setUTCDate(x.getUTCDate()+Number(b.interval_days));}return x}
const fmt=d=>d.toISOString().slice(0,10);
const reminderAt=s=>{const[y,m,d]=s.split("-").map(Number);return new Date(Date.UTC(y,m-1,d,9)-86400000)};
async function scheduleFor(b){if(!b.reminder_enabled||b.status!=="active")return null;const when=reminderAt(b.due_date);if(when<=new Date())return null;if(b.end_date&&b.due_date>b.end_date)return null;const task=await scheduler.at(when,"/api/reminders/send",{payload:{billId:b.id},name:"bill-reminder-"+b.id});await db.query("UPDATE bills SET reminder_task_id=$1,payment_task_id=$1,remind_at=NULL WHERE id=$2",[task.id,b.id]);return task}
export default async function(req,res){
 const b=req.body||{},id=b.id,action=b.action;
 if(!id||!["paid","remind"].includes(action))return res.status(400).json({error:"Bill id and a valid payment action are required."});
 const{rows}=await db.query("SELECT * FROM bills WHERE id=$1 AND user_id=$2",[id,req.user.id]);const bill=rows[0];if(!bill)return res.status(404).json({error:"Bill not found."});
 if(bill.frequency==="session_based"){
  if(action==="remind"){return res.status(400).json({error:"Session-based bills become payable when the required sessions are completed. Use Mark paid when the counter reaches the target."});}
  const target=Math.max(1,Number(bill.session_target)||1);
  const timing=bill.session_payment_timing==="first_session"?"first_session":"last_session";
  const count=Number(bill.session_count||0);
  if(timing==="first_session" && count<1)return res.status(400).json({error:"Complete at least the first session before marking this advance payment paid."});
  if(timing==="last_session" && count<target)return res.status(400).json({error:"The session target has not been reached yet."});
  if(timing==="first_session"){
    await db.query("UPDATE bills SET payment_status='paid',paid_at=NOW(),remind_at=NULL,payment_task_id=NULL,reminder_task_id=NULL,updated_at=NOW() WHERE id=$1 AND user_id=$2",[id,req.user.id]);
    return res.json({ok:true,action:"paid",bill_id:id,payment_status:"paid",session_count:count,session_cycle:Number(bill.session_cycle)||1});
  }
  const nextCycle=(Number(bill.session_cycle)||1)+1;
  await db.query("UPDATE bills SET session_cycle=$1,session_count=0,payment_status='unpaid',paid_at=NOW(),remind_at=NULL,payment_task_id=NULL,reminder_task_id=NULL,updated_at=NOW() WHERE id=$2 AND user_id=$3",[nextCycle,id,req.user.id]);
  return res.json({ok:true,action:"paid",bill_id:id,payment_status:"unpaid",session_count:0,session_cycle:nextCycle});
 }
 if(bill.payment_task_id)try{await scheduler.cancel(bill.payment_task_id)}catch{}
 if(action==="remind"){
  const days=Math.max(1,Math.min(365,Number(b.days)||1)),when=new Date(Date.now()+days*86400000);
  const task=await scheduler.at(when,"/api/reminders/send",{payload:{billId:id},name:"bill-reminder-"+id});
  await db.query("UPDATE bills SET payment_status='unpaid',remind_at=$1,payment_task_id=$2,reminder_task_id=$2,updated_at=NOW() WHERE id=$3 AND user_id=$4",[when.toISOString(),task.id,id,req.user.id]);
  return res.json({ok:true,action:"remind",remind_at:when.toISOString()});
 }
 const next=nextDue(bill);
 if(bill.frequency==="one_time"){
  await db.query("UPDATE bills SET payment_status='paid',paid_at=NOW(),remind_at=NULL,payment_task_id=NULL,reminder_task_id=NULL,updated_at=NOW() WHERE id=$1 AND user_id=$2",[id,req.user.id]);
  return res.json({ok:true,action:"paid",bill_id:id,payment_status:"paid"});
 }
 if(bill.end_date&&fmt(next)>bill.end_date){
  await db.query("UPDATE bills SET payment_status='paid',paid_at=NOW(),remind_at=NULL,payment_task_id=NULL,reminder_task_id=NULL,updated_at=NOW() WHERE id=$1 AND user_id=$2",[id,req.user.id]);
  return res.json({ok:true,action:"paid",bill_id:id,payment_status:"paid"});
 }
 await db.query("UPDATE bills SET due_date=$1,payment_status='unpaid',paid_at=NOW(),remind_at=NULL,payment_task_id=NULL,reminder_task_id=NULL,updated_at=NOW() WHERE id=$2 AND user_id=$3",[fmt(next),id,req.user.id]);
 const fresh=(await db.query("SELECT * FROM bills WHERE id=$1 AND user_id=$2",[id,req.user.id])).rows[0];
 await scheduleFor(fresh);
 const updated=(await db.query("SELECT id,name,amount,currency,category,frequency,interval_days,due_date,end_date,due_day,reminder_enabled,notes,status,paused_at,payment_status,paid_at,remind_at FROM bills WHERE id=$1",[id])).rows[0];
 res.json({ok:true,action:"paid",bill:updated});
}