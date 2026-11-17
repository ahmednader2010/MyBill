import {db} from "hatchable";
export const access="user"; export const methods=["GET"];
const addDays=(s,n)=>{const[y,m,d]=s.split("-").map(Number),x=new Date(Date.UTC(y,m-1,d+n));return x.toISOString().slice(0,10)};
const dayOfWeek=s=>{const[y,m,d]=s.split("-").map(Number);return new Date(Date.UTC(y,m-1,d)).getUTCDay()};
const today=()=>new Date().toISOString().slice(0,10);
const dateOnly=s=>String(s||"").slice(0,10);
export default async function(req,res){
 const id=req.query?.bill_id;
 if(!id)return res.status(400).json({error:"Bill id is required."});
 const bill=(await db.query("SELECT id,name,frequency,session_target,session_count,session_weekdays,session_schedule_start,session_cycle,session_payment_timing,payment_status FROM bills WHERE id=$1 AND user_id=$2",[id,req.user.id])).rows[0];
 if(!bill)return res.status(404).json({error:"Bill not found."});
 if(bill.frequency!=="session_based")return res.status(400).json({error:"This bill is not session based."});
 const currentCycle=Math.max(1,Number(bill.session_cycle)||1);
 const all=(await db.query("SELECT id,session_date,status,note,cycle,created_at FROM bill_sessions WHERE bill_id=$1 AND user_id=$2 ORDER BY session_date DESC,created_at DESC",[id,req.user.id])).rows;
 const periodsMap=new Map();
 for(const s of all){
   const c=Math.max(1,Number(s.cycle)||1),date=dateOnly(s.session_date);
   const p=periodsMap.get(c)||{cycle:c,start_date:date,end_date:date};
   if(date<p.start_date)p.start_date=date;
   if(date>p.end_date)p.end_date=date;
   periodsMap.set(c,p);
 }
 if(!periodsMap.has(currentCycle))periodsMap.set(currentCycle,{cycle:currentCycle,start_date:null,end_date:null});
 const periods=[...periodsMap.values()].sort((a,b)=>b.cycle-a.cycle).map(p=>({...p,is_current:p.cycle===currentCycle}));
 const requested=req.query?.cycle==null||req.query.cycle===""?currentCycle:Number(req.query.cycle);
 if(!Number.isInteger(requested)||!periodsMap.has(requested))return res.status(400).json({error:"Invalid payment period."});
 const selectedRows=all.filter(s=>Math.max(1,Number(s.cycle)||1)===requested);
 const completed=selectedRows.filter(s=>s.status==="completed").length;
 const target=Math.max(0,Number(bill.session_target)||0);
 const remaining=Math.max(0,target-completed);
 const items=[],todayKey=today();
 if(requested===currentCycle){
   const weekdays=new Set(String(bill.session_weekdays||"").split(",").filter(Boolean).map(Number));
   const byDate=new Map();
   for(const s of selectedRows){const date=dateOnly(s.session_date);if(!byDate.has(date))byDate.set(date,s);}
   const priorRows=all.filter(s=>Math.max(1,Number(s.cycle)||1)<currentCycle);
   const priorLatest=priorRows.map(s=>dateOnly(s.session_date)).sort().at(-1);
   const firstCurrent=selectedRows.map(s=>dateOnly(s.session_date)).sort()[0];
   const start=firstCurrent||(priorLatest?addDays(priorLatest,1):(bill.session_schedule_start||todayKey));
   let planned=0,futureSlots=0;
   const postponedFuture=selectedRows.filter(x=>x.status==="postponed"&&dateOnly(x.session_date)>=todayKey).length;
   const futureSlotsNeeded=remaining+postponedFuture;
   for(let d=start,guard=0;guard<4000&&(futureSlots<futureSlotsNeeded||d<=todayKey);d=addDays(d,1),guard++){
     if(!weekdays.has(dayOfWeek(d)))continue;
     const s=byDate.get(d);
     let status=s?.status||"planned";
     if(!s&&d<todayKey)status="missed";
     if(d>=todayKey){futureSlots++;if(status==="planned"&&planned<remaining)planned++;else if(status==="planned")continue;}
     items.push({date:d,status,note:s?.note||null,session_id:s?.id||null,cycle:requested,is_scheduled:true});
   }
   const scheduledDates=new Set(items.map(x=>x.date));
   for(const s of selectedRows){const date=dateOnly(s.session_date);if(!scheduledDates.has(date))items.push({date,status:s.status,note:s.note||null,session_id:s.id,cycle:requested,is_scheduled:false});}
 }else{
   for(const s of selectedRows)items.push({date:dateOnly(s.session_date),status:s.status,note:s.note||null,session_id:s.id,cycle:requested,is_scheduled:false});
 }
 items.sort((a,b)=>a.date.localeCompare(b.date));
 res.json({bill,current_cycle:currentCycle,selected_cycle:requested,periods,summary:{completed,target,remaining,missed:items.filter(x=>x.status==="missed").length,planned:items.filter(x=>x.status==="planned").length},items,history:selectedRows});
}