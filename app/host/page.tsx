import { CircleMark } from "@/components/CircleMark";
import { SITE_URL } from "@/lib/email.server";
import { requireHost } from "@/lib/host-auth.server";
import { hostCircles, type HostCircle, type HostGuest } from "@/lib/host.server";
import { signOut } from "../login/actions";
import { setRequestStatus } from "./actions";
import { CopyLink } from "./CopyLink";
import { NewLink } from "./NewLink";
import { AddGuest } from "./AddGuest";
import { RemoveGuest } from "./RemoveGuest";
import { EditIntroduction } from "./EditIntroduction";
import "./host.css";

export const dynamic = "force-dynamic";

const when = (iso: string) => new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
}).format(new Date(iso));

const EVENTS: Record<string, string> = {
  opened: "opened their link",
  saw_introduction: "saw their introduction",
  introduction_confirmed: "confirmed their introduction",
  introduction_changed: "changed their introduction",
  quiet_guest: "chose to be a quiet guest",
  sharing: "chose to share their introduction",
  cancelled: "said they can't come",
  uncancelled: "said they can come after all",
  intro_requested: "requested an introduction",
  link_resent: "was emailed a fresh link",
  new_link: "was given a new link",
  added_device: "opened their link on another device",
  recommended: "recommended a friend",
  wants_next: "would love to be considered for Beauty",
  feedback: "left a line of feedback",
  early_access: "requested early access to host",
};

function summary(circle: HostCircle) {
  const count = (status: HostGuest["status"]) => circle.guests.filter(guest => guest.status === status).length;
  const confirmed = count("Introduction confirmed") + count("Quiet guest");
  const parts = [`${circle.guests.length} invited`, `${confirmed} confirmed`, `${count("Opened")} opened but not confirmed`, `${count("Not opened")} not opened`];
  if (count("Can't come")) parts.push(`${count("Can't come")} can't come`);
  return parts.join(", ") + ".";
}

export default async function HostPage() {
  await requireHost();
  const circles = await hostCircles();
  return (
    <main className="host-page">
      <header className="host-top">
        <CircleMark className="host-mark" />
        <span>Guests</span>
        <form action={signOut}><button className="host-quiet">Sign out</button></form>
      </header>
      {circles.length === 0 && <p className="host-empty">No Circles yet. Import a guest list from Luma to begin.</p>}
      {circles.map(circle => {
        const guests = [...circle.guests].sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
        return (
          <section key={circle.id} className="host-circle">
            <h1>{circle.title}</h1>
            <p className="host-meta">With {circle.speaker}. {when(circle.startsAt)} UK time. Others revealed {when(circle.revealAt)}.</p>
            <p className="host-summary">{summary(circle)}</p>

            <h2>Guests</h2>
            <ul className="host-guests">
              {guests.map(guest => (
                <li key={guest.id} data-status={guest.status}>
                  <div className="host-guest-top">
                    <strong>{guest.name}</strong>
                    {guest.role === "speaker" && <span className="host-tag">Speaker</span>}
                    {guest.edited && <span className="host-tag">Edited</span>}
                    <span className="host-status">{guest.status}</span>
                  </div>
                  <p className="host-small">{guest.email}{guest.beenBefore ? " · been to a Circle before" : ""}{guest.lastSeen ? ` · last seen ${when(guest.lastSeen)}` : ""}</p>
                  <EditIntroduction key={guest.introduction} guestId={guest.id} introduction={guest.introduction} />
                  <div className="host-actions">
                    <CopyLink url={`${SITE_URL}/${guest.token}`} />
                    <NewLink guestId={guest.id} name={guest.name} />
                    <RemoveGuest guestId={guest.id} name={guest.name} />
                  </div>
                </li>
              ))}
            </ul>
            <AddGuest circleId={circle.id} />

            <h2>Introduction requests</h2>
            {circle.requests.length === 0 ? <p className="host-empty">None yet. Guests can ask after the reveal.</p> : (
              <ul className="host-requests">
                {circle.requests.map(request => (
                  <li key={request.id}>
                    <p><strong>{request.from}</strong> would like to meet <strong>{request.to}</strong></p>
                    {request.note && <p className="host-intro">{request.note}</p>}
                    <div className="host-actions">
                      {["new", "introduced", "not now"].map(status => (
                        <form key={status} action={setRequestStatus.bind(null, request.id, status)}>
                          <button className="host-quiet" aria-pressed={request.status === status}>
                            {status === "new" ? "New" : status === "introduced" ? "Introduced" : "Not now"}
                          </button>
                        </form>
                      ))}
                      <span className="host-small">{when(request.at)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <h2>Feedback</h2>
            {circle.feedback.length === 0 ? <p className="host-empty">None yet. Guests can leave one line after the Circle.</p> : (
              <ul className="host-requests">
                {circle.feedback.map((item, index) => (
                  <li key={index}>
                    <p><strong>{item.from}</strong>: {item.line}</p>
                    <span className="host-small">{when(item.at)}</span>
                  </li>
                ))}
              </ul>
            )}

            <h2>Would love to be considered for Beauty</h2>
            {circle.wantsNext.length === 0 ? <p className="host-empty">None yet. Guests can ask after the Circle.</p> : (
              <p>{circle.wantsNext.join(", ")}</p>
            )}

            <h2>Recommended friends</h2>
            {circle.recommendations.length === 0 ? <p className="host-empty">None yet. Guests can recommend friends after the Circle.</p> : (
              <ul className="host-requests">
                {circle.recommendations.map((rec, index) => (
                  <li key={index}>
                    <p><strong>{rec.from}</strong> recommends <strong>{rec.recommended}</strong></p>
                    <span className="host-small">{when(rec.at)}</span>
                  </li>
                ))}
              </ul>
            )}

            <h2>Activity</h2>
            {circle.activity.length === 0 ? <p className="host-empty">Nothing yet.</p> : (
              <ul className="host-activity">
                {circle.activity.map((event, index) => (
                  <li key={index}><span className="host-small">{when(event.at)}</span> {event.name} {EVENTS[event.kind] ?? event.kind}</li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </main>
  );
}
