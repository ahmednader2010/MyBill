import {events} from "hatchable";
export const access="user";export const methods=["GET"];
export default async function(req,res){const channel="bills:"+String(req.user.id);res.json(await events.grant([channel]))}