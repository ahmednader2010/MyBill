import {config} from "hatchable";
export const access="user";export const methods=["GET"];
export default async function(req,res){const appId=await config.get("ONESIGNAL_APP_ID");if(!appId)return res.status(503).json({error:"OneSignal App ID is not configured."});res.json({appId});}