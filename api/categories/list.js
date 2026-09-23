import {db} from "hatchable";
export const access="user"; export const methods=["GET"];
const defaults=[
["Housing",["Rent","Mortgage","Property tax","Home insurance","Maintenance"]],
["Utilities",["Electricity","Water","Gas","Internet","Mobile phone","Landline"]],
["Transportation",["Fuel","Public transport","Car payment","Car insurance","Parking","Maintenance"]],
["Subscriptions",["Streaming","Software","Cloud storage","Memberships","News"]],
["Food",["Groceries","Restaurants","Delivery","Coffee"]],
["Health",["Insurance","Doctor","Pharmacy","Dental","Fitness"]],
["Financial",["Bank fees","Credit card","Loan","Investment","Taxes"]],
["Education",["Tuition","Courses","Books","School"]],
["Shopping",["Clothing","Electronics","Home goods","Personal care"]],
["Family",["Childcare","School fees","Activities","Support"]],
["Travel",["Flights","Hotels","Transport","Travel insurance"]],
["Other",["General","Miscellaneous"]]
];
async function seedDefaults(userId){
 const setting=(await db.query("SELECT defaults_seeded FROM bill_category_settings WHERE user_id=$1",[userId])).rows[0];
 if(setting?.defaults_seeded)return;
 const parentNames=defaults.map(([name])=>name);
 const parentValues=parentNames.map((_,i)=>`($${i+2})`).join(",");
 await db.query(
   `INSERT INTO bill_categories(user_id,name,is_default)
    SELECT $1,v.name,true FROM (VALUES ${parentValues}) v(name)
    WHERE NOT EXISTS (
      SELECT 1 FROM bill_categories c WHERE c.user_id=$1 AND c.parent_id IS NULL AND c.name=v.name
    )`,
   [userId,...parentNames]
 );
 const subPairs=[];
 for(const [parent,subs] of defaults) for(const sub of subs) subPairs.push([parent,sub]);
 const pairValues=subPairs.map((_,i)=>`($${i*2+2},$${i*2+3})`).join(",");
 const pairParams=[userId,...subPairs.flat()];
 await db.query(
   `INSERT INTO bill_categories(user_id,name,parent_id,is_default)
    SELECT $1,v.sub,p.id,true
    FROM (VALUES ${pairValues}) v(parent_name,sub)
    JOIN bill_categories p ON p.user_id=$1 AND p.parent_id IS NULL AND p.name=v.parent_name
    WHERE NOT EXISTS (
      SELECT 1 FROM bill_categories c
      WHERE c.user_id=$1 AND c.parent_id=p.id AND c.name=v.sub
    )`,
   pairParams
 );
 await db.query("INSERT INTO bill_category_settings(user_id,defaults_seeded) VALUES($1,true) ON CONFLICT(user_id) DO UPDATE SET defaults_seeded=true,updated_at=NOW()",[userId]);
}
export default async function(req,res){
 await seedDefaults(req.user.id);
 const {rows}=await db.query("SELECT id,name,parent_id,is_default FROM bill_categories WHERE user_id=$1 ORDER BY parent_id NULLS FIRST,name",[req.user.id]);
 res.json({categories:rows});
}