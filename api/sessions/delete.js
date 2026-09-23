import {db} from "hatchable";
export const access="user"; export const methods=["DELETE"];
export default async function(req,res){
 const id=req.body?.id;
 if(!id)return res.status(400).json({error:"Session id is required."});
 const row=(await db.query("SELECT bill_id FROM bill_sessions WHERE id=$1 AND user_id=$2",[id,req.user.id])).rows[0];
 if(!row)return res.status(404).json({error:"Session not found."});
 await db.query("DELETE FROM bill_sessions WHERE id=$1 AND user_id=$2",[id,req.user.id]);
 const bill=(await db.query("SELECT session_target FROM bills WHERE id=$1 AND user_id=$2",[row.bill_id,req.user.id])).rows[0];
 const count=(await db.query("SELECT COUNT(*)::int AS count FROM bill_sessions WHERE bill_id=$1 AND user_id=$2 AND cycle=$3 AND status='completed'",[row.bill_id,req.user.id,bill?.session_cycle||1])).rows[0].count;
 await db.query("UPDATE bills SET session_count=$1,payment_status=$2,updated_at=NOW() WHERE id=$3 AND user_id=$4",[count,count>=Math.max(1,Number(bill?.session_target)||1)?"due":"unpaid",row.bill_id,req.user.id]);
 res.json({ok:true});
}