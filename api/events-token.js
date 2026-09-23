import {events} from "hatchable";
export const access="user";export const methods=["GET"];
export default async function(req,res){res.json(await events.grant(["bills"]))}