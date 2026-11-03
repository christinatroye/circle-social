import { CircleMark } from "@/components/CircleMark";
import { SITE_URL } from "@/lib/email.server";
import { requireHost } from "@/lib/host-auth.server";
import { hostCircles, seatRequests, type HostCircle, type HostGuest } from "@/lib/host.server";
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
  saw_introduction: "saw their bio",
  introduction_confirmed: "approved their bio",
  introduction_changed: "changed their bio",
  quiet_guest: "chose to show just their name",
  sharing: "chose to share their bio",
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
  after_opened: "opened their after-Circle page",
  glimpse_opened: "opened the glimpse of Beauty",
  glimpse_passed: "went on without opening the glimpse",
  recommend_skipped: "skipped recommending a friend",
  reached_end: "reached the hosting step",
};

function summary(circle: HostCircle) {
  const count = (status: HostGuest["status"]) => circle.guests.filter(guest => guest.status === status).length;
  const confirmed = count("Bio approved") + count("Just their name");
  const parts = [`${circle.guests.length} invited`, `${confirmed} confirmed`, `${count("Opened")} opened but not confirmed`, `${count("Not opened")} not opened`];
  if (count("Can't come")) parts.push(`${count("Can't come")} can't come`);
  return parts.join(", ") + ".";
}

/** The Circle a tab opens on when none is picked: the next one coming up, otherwise the most recent. */
function defaultCircle(circles: HostCircle[]) {
  const now = Date.now();
  const upcoming = circles.filter(circle => new Date(circle.startsAt).getTime() + 2 * 60 * 60 * 1000 > now);
  return upcoming.at(-1) ?? circles[0];
}

export default async function HostPage({ searchParams }: PageProps<"/host">) {
  await requireHost();
  const [circles, allApplications] = await Promise.all([hostCircles(), seatRequests()]);
  const picked = (await searchParams).circle;
  const current = circles.find(circle => circle.slug === picked) ?? defaultCircle(circles);
  const shown = current ? [current] : [];
  const applications = allApplications.filter(application => application.event === current?.slug);
  return (
    <main className="host-page">
      <header className="host-top">
        <CircleMark className="host-mark" />
        <span>Guests</span>
        <form action={signOut}><button className="host-quiet">Sign out</button></form>
      </header>
      {circles.length > 1 && (
        <nav className="host-tabs" aria-label="Circles">
          {circles.map(circle => (
            <a key={circle.id} href={`/host?circle=${circle.slug}`} aria-current={circle.id === current?.id ? "page" : undefined}>{circle.title}</a>
          ))}
        </nav>
      )}
      {circles.length === 0 && <p className="host-empty">No Circles yet. Import a guest list from Luma to begin.</p>}
      {shown.map(circle => {
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

            <h2>Activity</h2>
            {circle.activity.length === 0 ? <p className="host-empty">Nothing yet.</p> : (
              <ul className="host-activity">
                {circle.activity.map((event, index) => (
                  <li key={index}><span className="host-small">{when(event.at)}</span> {event.name} {EVENTS[event.kind] ?? event.kind}</li>
                ))}
              </ul>
            )}

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

            {circle.wantsNext.length > 0 && <>
              <h2>Would love to be considered for Beauty</h2>
              <p>{circle.wantsNext.join(", ")}</p>
            </>}

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
          </section>
        );
      })}
      {current && applications.length > 0 && <section className="host-circle">
        <h1>Applications</h1>
        <p className="host-meta">People who applied for a seat at in.entercircle.co/{current.slug}.</p>
        <ul className="host-requests">
            {applications.map((application, index) => (
              <li key={index}>
                <p><strong>{application.name}</strong> <span className="host-tag">{application.invited ? "Invited" : "Public"}</span> <span className="host-small">{application.email}</span></p>
                {application.line && <p className="host-intro">{application.line}</p>}
                <span className="host-small">{when(application.at)}</span>
              </li>
            ))}
        </ul>
      </section>}
    </main>
  );
}
