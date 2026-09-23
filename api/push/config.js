export const access="user";export const methods=["GET"];
export default async function(req,res){res.json({appId:process.env.ONESIGNAL_APP_ID||null});}