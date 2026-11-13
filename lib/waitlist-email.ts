/** The waitlist email Christina sends herself from Gmail. Wording awaiting her approval. */
export function waitlistEmail(input: { first: string; email: string; title: string; speaker: string; date: string }) {
  const subject = `${input.title} with ${input.speaker}: you're on the waitlist`;
  const body = [
    `Hi ${input.first},`,
    "",
    `Thank you for asking for a seat at ${input.title} with ${input.speaker} on ${input.date}. All the seats are taken for now, so you're on the waitlist. If a seat opens up, I'll email you.`,
    "",
    "Warmly,",
    "Christina",
    "",
    "Christina Lundberg",
    "Founder, Circle",
    "entercircle.co/circle",
  ].join("\n");
  const params = new URLSearchParams({ authuser: "christina@entercircle.co", view: "cm", fs: "1", to: input.email, su: subject, body });
  return `https://mail.google.com/mail/?${params}`;
}
