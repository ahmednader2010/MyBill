import {db} from "hatchable";
export const access="user"; export const methods=["GET"];

const validDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(String(s||""));
const addDays=(s,n)=>{const[y,m,d]=s.split("-").map(Number),x=new Date(Date.UTC(y,m-1,d+n));return x.toISOString().slice(0,10)};
const dayOfWeek=s=>{const[y,m,d]=s.split("-").map(Number);return new Date(Date.UTC(y,m-1,d)).getUTCDay()};
const today=()=>{const d=new Date();return d.toISOString().slice(0,10)};

export default async function(req,res){
 const id=req.query?.bill_id;
 if(!id)return res.status(400).json({error:"Bill id is required."});
 const bill=(await db.query("SELECT id,name,frequency,session_target,session_count,session_weekdays,session_schedule_start,session_cycle,session_payment_timing,payment_status FROM bills WHERE id=$1 AND user_id=$2",[id,req.user.id])).rows[0];
 if(!bill)return res.status(404).json({error:"Bill not found."});
 if(bill.frequency!=="session_based")return res.status(400).json({error:"This bill is not session based."});
 const start=bill.session_schedule_start||today();
 const weekdays=new Set(String(bill.session_weekdays||"").split(",").filter(Boolean).map(Number));
 const logged=(await db.query("SELECT id,session_date,status,note,cycle,created_at FROM bill_sessions WHERE bill_id=$1 AND user_id=$2 ORDER BY session_date DESC,created_at DESC",[id,req.user.id])).rows;
 const byDate=new Map();
 for(const s of logged){if(!byDate.has(s.session_date))byDate.set(s.session_date,s);}
 const completed=Number(bill.session_count||0);
 const target=Number(bill.session_target||0);
 const remaining=Math.max(0,target-completed);
 const items=[];
 let planned=0,futureSlots=0;
 const todayKey=today();
 // A postponed future session still belongs to this package, so it needs another configured slot later.
 const postponedFuture=logged.filter(x=>x.status==="postponed"&&x.session_date>=todayKey).length;
 const futureSlotsNeeded=remaining+postponedFuture;
 for(let d=start,guard=0;guard<4000 && (futureSlots<futureSlotsNeeded || d<=todayKey);d=addDays(d,1),guard++){
   if(!weekdays.has(dayOfWeek(d)))continue;
   const s=byDate.get(d);
   let status=s?.status||"planned";
   if(!s&&d<todayKey)status="missed";
   if(d>=todayKey){
     futureSlots++;
     if(status==="planned" && planned<remaining)planned++;
     else if(status==="planned")continue;
   }
   items.push({date:d,status,note:s?.note||null,session_id:s?.id||null,cycle:s?.cycle||Number(bill.session_cycle)||1});
 }
 res.json({bill,summary:{completed,target,remaining,missed:items.filter(x=>x.status==="missed").length,planned:items.filter(x=>x.status==="planned").length},items,history:logged});
}