import { db } from "hatchable";

export const access = "user";
export const methods = ["GET"];

export default async function (req, res) {
  const { rows } = await db.query(
    "SELECT id, name, amount, currency, category, frequency, interval_days, due_date, end_date, due_day, reminder_enabled, notes, status, paused_at, payment_status, paid_at, remind_at, payment_method_id, payment_method_name, payment_card_last4, subscription_id, session_target, session_count, session_weekdays, session_next_date, session_cycle, session_payment_timing FROM bills WHERE user_id = $1 ORDER BY due_date, name",
    [req.user.id]
  );
  res.json({ bills: rows });
}