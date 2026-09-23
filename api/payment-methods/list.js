import {db} from "hatchable";
export const access="user"; export const methods=["GET"];
const defaults=[["Cash","cash"],["Cellular provider","cellular"],["Bank card","card"],["Bank transfer","bank_transfer"],["Other","other"]];
async function seed(userId){const x=await db.query("SELECT COUNT(*)::int AS n FROM bill_payment_methods WHERE user_id=$1",[userId]);if(x.rows[0].n)return;for(const [name,type] of defaults)await db.query("INSERT INTO bill_payment_methods(user_id,name,type,is_default) VALUES($1,$2,$3,true)",[userId,name,type]);}
export default async function(req,res){await seed(req.user.id);const {rows}=await db.query("SELECT id,name,type,card_last4,is_default FROM bill_payment_methods WHERE user_id=$1 ORDER BY is_default DESC,name",[req.user.id]);res.json({payment_methods:rows});}