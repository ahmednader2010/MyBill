import {db} from "hatchable";
export const access="user"; export const methods=["GET"];
export default async function(req,res){
 const id=req.query?.bill_id;
 if(!id)return res.status(400).json({error:"Bill id is required."});
 const {rows}=await db.query("SELECT id,bill_id,session_date,status,note,cycle,created_at FROM bill_sessions WHERE bill_id=$1 AND user_id=$2 ORDER BY session_date DESC,created_at DESC",[id,req.user.id]);
 res.json({sessions:rows});
}