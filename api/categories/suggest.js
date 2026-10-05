import {ai,db} from "hatchable";
export const access="user"; export const methods=["POST"];
const aliases={
  youtube:["Subscriptions","Streaming"],"youtube premium":["Subscriptions","Streaming"],
  netflix:["Subscriptions","Streaming"],spotify:["Subscriptions","Streaming"],
  "amazon prime":["Subscriptions","Streaming"],"prime video":["Subscriptions","Streaming"],"disney+":["Subscriptions","Streaming"],
  "apple tv":["Subscriptions","Streaming"],"apple music":["Subscriptions","Streaming"],
  chatgpt:["Subscriptions","Software"],github:["Subscriptions","Software"],adobe:["Subscriptions","Software"],
  "google one":["Subscriptions","Cloud storage"],icloud:["Subscriptions","Cloud storage"],dropbox:["Subscriptions","Cloud storage"],
  "microsoft 365":["Subscriptions","Software"],"office 365":["Subscriptions","Software"],
  vodafone:["Utilities","Mobile phone"],orange:["Utilities","Mobile phone"],etisalat:["Utilities","Mobile phone"],we:["Utilities","Internet"],
  uber:["Transportation","Public transport"],careem:["Transportation","Public transport"],shell:["Transportation","Fuel"],esso:["Transportation","Fuel"],
  talabat:["Food","Delivery"],instashop:["Food","Groceries"]
};
function deterministic(name,rows){
 const lower=name.toLowerCase().replace(/[^a-z0-9+ ]/g," ").replace(/\s+/g," ").trim();
 for(const key of Object.keys(aliases).sort((a,b)=>b.length-a.length)){
  if(!lower.includes(key))continue;
  const pair=aliases[key];
  const parent=rows.find(x=>x.name.toLowerCase()===pair[0].toLowerCase()&&!x.parent_id);
  const sub=parent?rows.find(x=>x.name.toLowerCase()===pair[1].toLowerCase()&&x.parent_id===parent.id):null;
  if(parent)return {category_id:parent.id,category:parent.name,subcategory_id:sub?.id||null,subcategory:sub?.name||null,confidence:.99,reason:"Matched a known bill or service name."};
 }
 const exact=rows.find(x=>lower===x.name.toLowerCase());
 if(exact){const parent=exact.parent_id?rows.find(x=>x.id===exact.parent_id):exact;return {category_id:parent.id,category:parent.name,subcategory_id:exact.parent_id?exact.id:null,subcategory:exact.parent_id?exact.name:null,confidence:.95,reason:"Matched your category name."};}
 return null;
}
export default async function(req,res){
 const name=String(req.body?.name||"").trim();
 if(!name)return res.status(400).json({error:"Bill name is required."});
 const {rows}=await db.query("SELECT id,name,parent_id FROM bill_categories WHERE user_id=$1 ORDER BY parent_id NULLS FIRST,name",[req.user.id]);
 const direct=deterministic(name,rows);
 if(direct)return res.json({suggestion:direct,auto_apply:true});
 const prompt="Classify this personal bill/service into the closest category from the exact user-owned list. Use real-world knowledge: YouTube/Netflix/Spotify are streaming subscriptions, Uber/Careem are transportation, Vodafone/Orange/Etisalat are mobile services. Return JSON only with category_id, category, subcategory_id, subcategory, confidence, reason. Bill name: "+name+"\nCategories:\n"+rows.map(x=>"id="+x.id+"; name="+x.name+"; parent_id="+(x.parent_id||"null")).join("\n");
 try{
  const result=await ai.generateText({prompt});
  const raw=typeof result==="string"?result:(result?.text||result?.output||"");
  const parsed=JSON.parse(raw.replace(/^\`\`\`json\s*/,"").replace(/\s*\`\`\`$/,"").trim());
  const cat=rows.find(x=>x.id===parsed.category_id),sub=rows.find(x=>x.id===parsed.subcategory_id);
  if(!cat)return res.json({suggestion:null});
  const confidence=Math.max(0,Math.min(1,Number(parsed.confidence)||0));
  res.json({suggestion:{category_id:cat.id,category:cat.name,subcategory_id:sub?.id||null,subcategory:sub?.name||null,confidence,reason:String(parsed.reason||"")},auto_apply:confidence>=.85});
 }catch(e){res.json({suggestion:null});}
}