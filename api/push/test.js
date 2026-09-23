import {db} from "hatchable";
export const access="user";export const methods=["POST"];
export default async function(req,res){
 const apiKey=process.env.ONESIGNAL_API_KEY,appId=process.env.ONESIGNAL_APP_ID;
 if(!apiKey||!appId)return res.status(503).json({error:"Push provider is not configured yet."});
 const body=req.body||{},user=req.user;
 const response=await fetch("https://api.onesignal.com/notifications",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Key "+apiKey},body:JSON.stringify({app_id:appId,target_channel:"push",include_aliases:{external_id:[String(user.id)]},headings:{en:"MyBill notifications are working"},contents:{en:"You will now receive bill payment reminders on this device."},url:"https://mybill.hatchable.site/"})});
 const data=await response.json();
 if(!response.ok)return res.status(502).json({error:"Push provider rejected the test notification.",details:data});
 res.json({ok:true,data});
}