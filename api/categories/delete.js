import {db} from "hatchable";
export const access="user"; export const methods=["DELETE"];
export default async function(req,res){
 const id=req.body?.id;
 if(!id)return res.status(400).json({error:"Category id is required."});
 const c=(await db.query("SELECT id,parent_id FROM bill_categories WHERE id=$1 AND user_id=$2",[id,req.user.id])).rows[0];
 if(!c)return res.status(404).json({error:"Category not found."});
 await db.query("UPDATE bills SET category=NULL WHERE user_id=$1 AND category=(SELECT name FROM bill_categories WHERE id=$2)",[req.user.id,id]);
 await db.query("DELETE FROM bill_categories WHERE id=$1 AND user_id=$2",[id,req.user.id]);
 res.json({ok:true});
}