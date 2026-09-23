import {db} from "hatchable";
export const access="user"; export const methods=["POST"];
const validDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(String(s||""));
export default async function(req,res){
 const b=req.body||{};
 if(!b.bill_id||!validDate(b.session_date)||!["completed","postponed","cancelled"].includes(b.status))return res.status(400).json({error:"Bill, date and valid session status are required."});
 const bill=(await db.query("SELECT * FROM bills WHERE id=$1 AND user_id=$2",[b.bill_id,req.user.id])).rows[0];
 if(!bill)return res.status(404).json({error:"Bill not found."});
 if(bill.frequency!=="session_based")return res.status(400).json({error:"This bill is not session based."});
 const target=Math.max(1,Number(bill.session_target)||1);
 let cycle=Math.max(1,Number(bill.session_cycle)||1);
 let currentCount=Math.max(0,Number(bill.session_count)||0);
 const timing=bill.session_payment_timing==="first_session"?"first_session":"last_session";
 const existing=(await db.query("SELECT id,status,cycle FROM bill_sessions WHERE id=$1 AND bill_id=$2 AND user_id=$3",[b.id||"00000000-0000-0000-0000-000000000000",b.bill_id,req.user.id])).rows[0];

 // For advance payment, once the previous package is complete, the next new session starts a new cycle and triggers the next advance payment.
 if(!existing && timing==="first_session" && bill.payment_status==="paid" && currentCount>=target){
   cycle+=1;
   currentCount=0;
   await db.query("UPDATE bills SET session_cycle=$1,session_count=0,payment_status='unpaid',paid_at=NULL,updated_at=NOW() WHERE id=$2 AND user_id=$3",[cycle,b.bill_id,req.user.id]);
   bill.payment_status="unpaid";
 }

 let session;
 if(existing){
   session=(await db.query("UPDATE bill_sessions SET session_date=$1,status=$2,note=$3,updated_at=NOW() WHERE id=$4 AND bill_id=$5 AND user_id=$6 RETURNING *",[b.session_date,b.status,b.note||null,existing.id,b.bill_id,req.user.id])).rows[0];
   cycle=existing.cycle||cycle;
 }else{
   session=(await db.query("INSERT INTO bill_sessions (user_id,bill_id,session_date,status,note,cycle) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *",[req.user.id,b.bill_id,b.session_date,b.status,b.note||null,cycle])).rows[0];
 }

 const count=(await db.query("SELECT COUNT(*)::int AS count FROM bill_sessions WHERE bill_id=$1 AND user_id=$2 AND cycle=$3 AND status='completed'",[b.bill_id,req.user.id,cycle])).rows[0].count;
 let paymentStatus=bill.payment_status||"unpaid";
 let nextCycle=cycle;
 let finalCount=count;
 let paidNow=false;

 if(b.status==="completed"){
   if(timing==="first_session" && count>=1 && paymentStatus!=="paid"){
     paymentStatus="paid"; paidNow=true;
   } else if(timing==="last_session" && count>=target){
     paymentStatus="unpaid"; paidNow=true;
     nextCycle=cycle+1;
     finalCount=0;
   }
 }

 await db.query("UPDATE bills SET session_count=$1,payment_status=$2,paid_at=CASE WHEN $3 THEN NOW() ELSE paid_at END,session_cycle=$4,updated_at=NOW() WHERE id=$5 AND user_id=$6",[finalCount,paymentStatus,paidNow,nextCycle,b.bill_id,req.user.id]);

 const updated=(await db.query("SELECT id,name,amount,currency,frequency,session_target,session_count,session_weekdays,session_next_date,payment_status,paid_at,session_cycle,session_payment_timing,due_date FROM bills WHERE id=$1 AND user_id=$2",[b.bill_id,req.user.id])).rows[0];
 res.json({session,bill:updated,paid_now:paidNow,payment_timing:timing});
}