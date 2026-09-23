import {db} from "hatchable";
export const access="user"; export const methods=["POST"];
export default async function(req,res){
 const b=req.body||{}; const name=String(b.name||"").trim();
 if(!name)return res.status(400).json({error:"Category name is required."});
 if(b.parent_id){
  const p=(await db.query("SELECT id FROM bill_categories WHERE id=$1 AND user_id=$2",[b.parent_id,req.user.id])).rows[0];
  if(!p)return res.status(400).json({error:"Parent category not found."});
 }
 if(b.id){
  const {rows}=await db.query("UPDATE bill_categories SET name=$1,parent_id=$2,is_default=false,updated_at=NOW() WHERE id=$3 AND user_id=$4 RETURNING id,name,parent_id,is_default",[name,b.parent_id||null,b.id,req.user.id]);
  if(!rows[0])return res.status(404).json({error:"Category not found."});
  return res.json({category:rows[0]});
 }
 const {rows}=await db.query("INSERT INTO bill_categories(user_id,name,parent_id,is_default) VALUES($1,$2,$3,false) RETURNING id,name,parent_id,is_default",[req.user.id,name,b.parent_id||null]);
 res.status(201).json({category:rows[0]});
}