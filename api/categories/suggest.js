import {ai,db} from "hatchable";
export const access="user"; export const methods=["POST"];
export default async function(req,res){
 const name=String(req.body?.name||"").trim();
 if(!name)return res.status(400).json({error:"Bill name is required."});
 const {rows}=await db.query("SELECT id,name,parent_id FROM bill_categories WHERE user_id=$1 ORDER BY parent_id NULLS FIRST,name",[req.user.id]);
 const prompt=`You classify personal bills. Match the bill name to the closest category and optional subcategory from this exact list. Return JSON only: {"category_id":"...","category":"...","subcategory_id":"...","subcategory":"...","confidence":0.0,"reason":"short"}.
Bill name: ${name}
Categories:
${rows.map(x=>`id=${x.id}; name=${x.name}; parent_id=${x.parent_id||"null"}`).join("\n")}`;
 try{
   const result=await ai.generateText({prompt});
   const raw=typeof result==="string"?result:(result?.text||result?.output||"");
   const parsed=JSON.parse(raw.replace(/^\`\`\`json\s*/,"").replace(/\s*\`\`\`$/,"").trim());
   const cat=rows.find(x=>x.id===parsed.category_id);
   const sub=rows.find(x=>x.id===parsed.subcategory_id);
   if(!cat)return res.json({suggestion:null});
   res.json({suggestion:{category_id:cat.id,category:cat.name,subcategory_id:sub?.id||null,subcategory:sub?.name||null,confidence:Number(parsed.confidence)||0,reason:String(parsed.reason||"")}});
 }catch(e){
   const lower=name.toLowerCase();
   const hit=rows.find(x=>!x.parent_id && lower.includes(x.name.toLowerCase()));
   res.json({suggestion:hit?{category_id:hit.id,category:hit.name,subcategory_id:null,subcategory:null,confidence:.35,reason:"Fallback match"}:null});
 }
}