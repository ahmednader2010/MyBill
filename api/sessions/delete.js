import {db} from "hatchable";
export const access="user";
export const methods=["DELETE"];

export default async function(req,res){
 const b=req.body||{};
 if(!b.id||!b.bill_id)return res.status(400).json({error:"Session id and bill id are required."});
 const bill=(await db.query("SELECT id,session_cycle FROM bills WHERE id=$1 AND user_id=$2 AND frequency='session_based'",[b.bill_id,req.user.id])).rows[0];
 if(!bill)return res.status(404).json({error:"Session-based bill not found."});
 const deleted=(await db.query("DELETE FROM bill_sessions WHERE id=$1 AND bill_id=$2 AND user_id=$3 RETURNING id,cycle,status",[b.id,b.bill_id,req.user.id])).rows[0];
 if(!deleted)return res.status(404).json({error:"Session entry not found."});
 const currentCycle=Math.max(1,Number(bill.session_cycle)||1);
 const deletedCycle=Math.max(1,Number(deleted.cycle)||1);
 let count=null;
 if(deletedCycle===currentCycle){
   count=(await db.query("SELECT COUNT(*)::int AS count FROM bill_sessions WHERE bill_id=$1 AND user_id=$2 AND cycle=$3 AND status='completed'",[b.bill_id,req.user.id,currentCycle])).rows[0].count;
   // Keep payment history unchanged; deleting a log must not reverse a payment already recorded.
   await db.query("UPDATE bills SET session_count=$1,updated_at=NOW() WHERE id=$2 AND user_id=$3",[count,b.bill_id,req.user.id]);
 }
 return res.json({deleted:true,session_id:deleted.id,cycle:deletedCycle,session_count:count});
}