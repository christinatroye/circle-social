import "server-only";

export const SITE_URL = (process.env.SITE_URL ?? "https://in.entercircle.co").replace(/\/$/, "");

export async function sendFreshLink({ to, firstName, circleTitle, token }: { to: string; firstName: string; circleTitle: string; token: string }) {
  const key = process.env.RESEND_API_KEY, from = process.env.EMAIL_FROM;
  if (!key || !from) throw new Error("Email is not configured");
  const link = `${SITE_URL}/${token}`;
  const text = `${firstName}, here is your way back into your next Circle: ${circleTitle}.\n\n${link}\n\nThis link replaces the one you had before.\n\nCircle`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject: `Your way back into Circle: ${circleTitle}`, text }),
  });
  if (!response.ok) throw new Error(`Resend refused the email (${response.status})`);
}
