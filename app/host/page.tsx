import { CircleMark } from "@/components/CircleMark";
import { SITE_URL } from "@/lib/email.server";
import { requireHost } from "@/lib/host-auth.server";
import { hostCircles, seatRequests, type HostCircle, type HostGuest } from "@/lib/host.server";
import { signOut } from "../login/actions";
import { confirmRequest, setBioReady, setRequestStatus, setRequestWaitlisted, setWaitlisted } from "./actions";
import { waitlistEmail } from "@/lib/waitlist-email";
import { CopyLink } from "./CopyLink";
import { NewLink } from "./NewLink";
import { AddGuest } from "./AddGuest";
import { RemoveGuest } from "./RemoveGuest";
import { EditIntroduction } from "./EditIntroduction";
import { WaitlistEmail } from "./WaitlistEmail";
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
  waitlist_seat: "took a place from the waitlist",
  uncancelled: "said they can come after all",
  intro_requested: "requested an introduction",
  link_resent: "was emailed a fresh link",
  new_link: "was given a new link",
  added_device: "opened their link on another device",
  recommended: "recommended a friend",
  wants_next: "would like a place at the next Circle",
  feedback: "left a line of feedback",
  early_access: "requested early access to host",
  after_opened: "opened their after-Circle page",
  glimpse_opened: "opened the glimpse of Beauty",
  glimpse_passed: "went on without opening the glimpse",
  recommend_skipped: "skipped recommending a friend",
  reached_end: "reached the hosting step",
  reveal_visit: "came back after the reveal",
  wall_opened: "opened the wall",
  wall_post: "posted on the wall",
  expect_opened: "read What to expect",
};

function summary(circle: HostCircle) {
  const count = (status: HostGuest["status"]) => circle.guests.filter(guest => guest.status === status).length;
  const confirmed = count("Bio approved") + count("Just their name");
  const parts = [`${circle.guests.length - count("Waitlist")} invited`, `${confirmed} approved their bio`, `${count("Opened")} opened but not approved`, `${count("Not opened")} not opened`];
  if (count("Can't come")) parts.push(`${count("Can't come")} can't come`);
  if (count("Waitlist")) parts.push(`${count("Waitlist")} on the waitlist`);
  return parts.join(", ") + ".";
}

const day = (iso: string) => new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short" }).format(new Date(iso));
const longDate = (iso: string) => new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "long", day: "numeric", month: "long" }).format(new Date(iso));

const BIO_ORDER: HostGuest["bio"][] = ["Bio missing", "Bio drafted", "Bio ready"];
const BIO_FILTERS: Record<string, HostGuest["bio"]> = { missing: "Bio missing", drafted: "Bio drafted", ready: "Bio ready" };

/** The Circle a tab opens on when none is picked: the next one coming up, otherwise the most recent. */
function defaultCircle(circles: HostCircle[]) {
  const now = Date.now();
  const upcoming = circles.filter(circle => new Date(circle.startsAt).getTime() + 2 * 60 * 60 * 1000 > now);
  return upcoming.at(-1) ?? circles[0];
}

export default async function HostPage({ searchParams }: PageProps<"/host">) {
  await requireHost();
  const [circles, allApplications] = await Promise.all([hostCircles(), seatRequests()]);
  const params = await searchParams;
  const picked = params.circle;
  const bioFilter = BIO_FILTERS[String(params.bio ?? "")];
  const current = circles.find(circle => circle.slug === picked) ?? defaultCircle(circles);
  const shown = current ? [current] : [];
  // One entry per email, newest first. Someone already on the guest list is no longer a request.
  const onList = new Set((current?.guests ?? []).map(guest => guest.email.toLowerCase()));
  const seen = new Set<string>();
  const applications = allApplications.filter(application => {
    const email = application.email.toLowerCase();
    if (application.event !== current?.slug || seen.has(email)) return false;
    seen.add(email);
    return true;
  });
  const fromRequest = new Map(applications.map(application => [application.email.toLowerCase(), application]));
  const openRequests = applications.filter(application => !onList.has(application.email.toLowerCase()) && !application.waitlisted);
  const waitlistedRequests = applications.filter(application => !onList.has(application.email.toLowerCase()) && application.waitlisted);
  const waitlisted = (current?.guests ?? []).filter(guest => guest.status === "Waitlist").sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
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
        const confirmed = circle.guests.filter(guest => guest.status !== "Waitlist");
        const bioCount = (bio: HostGuest["bio"]) => confirmed.filter(guest => guest.bio === bio).length;
        const guests = confirmed.filter(guest => !bioFilter || guest.bio === bioFilter)
          .sort((a, b) => BIO_ORDER.indexOf(a.bio) - BIO_ORDER.indexOf(b.bio) || a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
        const tab = (bio?: string) => `/host?circle=${circle.slug}${bio ? `&bio=${bio}` : ""}`;
        return (
          <section key={circle.id} className="host-circle">
            <h1>{circle.title}</h1>
            <p className="host-meta">With {circle.speaker}. {when(circle.startsAt)} UK time. Others revealed {when(circle.revealAt)}.</p>
            <p className="host-summary">{summary(circle)}</p>
            <p className="host-summary">
              {openRequests.length} {openRequests.length === 1 ? "request" : "requests"}, {confirmed.length} confirmed{waitlistedRequests.length ? `, ${waitlistedRequests.length} requests on the waitlist` : ""}.
              {" "}Bios: {bioCount("Bio missing")} missing, {bioCount("Bio drafted")} drafted, {bioCount("Bio ready")} ready.
            </p>

            {openRequests.length > 0 && <>
              <h2>Requests</h2>
              <p className="host-note">People who asked for a seat. Confirm moves them to Confirmed so you can prepare their bio. Waitlist moves them to the waitlist. Nothing is sent to them.</p>
              <ul className="host-guests">
                {openRequests.map(request => (
                  <li key={request.id}>
                    <div className="host-guest-top">
                      <strong>{request.name}</strong>
                      <span className="host-tag">{request.invited ? "Invited" : "Public"}</span>
                      <span className="host-status">{day(request.at)}</span>
                    </div>
                    <p className="host-small">{request.email}</p>
                    {request.line && <p className="host-their">Their line: <i>{request.line}</i></p>}
                    <div className="host-actions">
                      <form action={confirmRequest.bind(null, request.id)}><button className="host-go">Confirm</button></form>
                      <form action={setRequestWaitlisted.bind(null, request.id, true)}><button className="host-quiet">Waitlist</button></form>
                    </div>
                  </li>
                ))}
              </ul>
            </>}

            <h2>Confirmed</h2>
            <nav className="host-filters" aria-label="Bios">
              <a href={tab()} aria-current={!bioFilter ? "page" : undefined}>All {confirmed.length}</a>
              {Object.entries(BIO_FILTERS).map(([key, bio]) => (
                <a key={key} href={tab(key)} aria-current={bioFilter === bio ? "page" : undefined}>{bio} {bioCount(bio)}</a>
              ))}
            </nav>
            <ul className="host-guests">
              {guests.map(guest => {
                const request = fromRequest.get(guest.email.toLowerCase());
                return (
                  <li key={guest.id} data-status={guest.status} data-bio={guest.bio}>
                    <div className="host-guest-top">
                      <strong>{guest.name}</strong>
                      {guest.role === "speaker" && <span className="host-tag">Speaker</span>}
                      {request && <span className="host-tag">{request.invited ? "Invited" : "Public"}</span>}
                      {guest.edited && <span className="host-tag">Edited</span>}
                      <span className="host-status host-bio">{guest.bio}</span>
                    </div>
                    <p className="host-small">{guest.email} · {guest.status}{guest.bioReadyAt ? ` · bio ready ${day(guest.bioReadyAt)}` : ""}{guest.beenBefore ? " · been to a Circle before" : ""}{guest.lastSeen ? ` · last seen ${when(guest.lastSeen)}` : ""}</p>
                    {request?.line && guest.bio !== "Bio ready" && <p className="host-their">Their line: <i>{request.line}</i></p>}
                    <EditIntroduction key={guest.introduction} guestId={guest.id} introduction={guest.introduction} />
                    <div className="host-actions">
                      {guest.bio === "Bio drafted" && <form action={setBioReady.bind(null, guest.id, true)}><button className="host-go">Bio ready</button></form>}
                      {guest.bio === "Bio ready" && <form action={setBioReady.bind(null, guest.id, false)}><button className="host-quiet">Not ready yet</button></form>}
                      <CopyLink url={`${SITE_URL}/${guest.token}`} />
                      <NewLink guestId={guest.id} name={guest.name} />
                      {guest.role !== "speaker" && <form action={setWaitlisted.bind(null, guest.id, true)}><button className="host-quiet">Move to waitlist</button></form>}
                      <RemoveGuest guestId={guest.id} name={guest.name} backToRequests={Boolean(request)} />
                    </div>
                  </li>
                );
              })}
            </ul>
            {guests.length === 0 && <p className="host-empty">{bioFilter ? "Nobody here." : "Nobody confirmed yet."}</p>}
            <AddGuest circleId={circle.id} />

            <h2>Activity</h2>
            {circle.activity.length === 0 ? <p className="host-empty">Nothing yet.</p> : (
              <ul className="host-activity">
                {circle.activity.map((event, index) => (
                  <li key={index}><span className="host-small">{when(event.at)}</span> {event.name} {event.kind.startsWith("read_bio:") ? `read ${event.about ?? "a guest"}'s bio` : EVENTS[event.kind] ?? event.kind}</li>
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
              <h2>Would like a place at the next Circle</h2>
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
      {current && (waitlistedRequests.length > 0 || waitlisted.length > 0) && <section className="host-circle">
        <h1>Waitlist</h1>
        <p className="host-meta">Guests you moved off the list keep a working link: the first to open it take any free places, up to 25. Once the Circle is full, their links close. Below them, requests you moved to the waitlist. Draft waitlist email opens the email in Gmail for you to send.</p>
        {waitlisted.length > 0 && <ul className="host-guests">
          {waitlisted.map(guest => (
            <li key={guest.id} data-status={guest.status}>
              <div className="host-guest-top"><strong>{guest.name}</strong><span className="host-status">Waitlist</span></div>
              <p className="host-small">{guest.email}{guest.lastSeen ? ` · last seen ${when(guest.lastSeen)}` : ""}</p>
              <p className="host-intro">{guest.introduction}</p>
              <div className="host-actions">
                <form action={setWaitlisted.bind(null, guest.id, false)}><button className="host-quiet">Give them a seat</button></form>
                <CopyLink url={`${SITE_URL}/${guest.token}`} />
              </div>
            </li>
          ))}
        </ul>}
        <ul className="host-guests">
          {waitlistedRequests.map(request => (
            <li key={request.id}>
              <div className="host-guest-top">
                <strong>{request.name}</strong>
                <span className="host-tag">{request.invited ? "Invited" : "Public"}</span>
                <span className="host-status">{request.waitlistEmailAt ? `Email drafted ${day(request.waitlistEmailAt)}` : "Email not drafted"}</span>
              </div>
              <p className="host-small">{request.email} · asked {day(request.at)}</p>
              {request.line && <p className="host-their">Their line: <i>{request.line}</i></p>}
              <div className="host-actions">
                <WaitlistEmail requestId={request.id} drafted={Boolean(request.waitlistEmailAt)} gmailUrl={waitlistEmail({
                  first: request.name.trim().split(/\s+/)[0], email: request.email, title: current.title, speaker: current.speaker, date: longDate(current.startsAt),
                })} />
                <form action={confirmRequest.bind(null, request.id)}><button className="host-quiet">Confirm</button></form>
                <form action={setRequestWaitlisted.bind(null, request.id, false)}><button className="host-quiet">Move back to requests</button></form>
              </div>
            </li>
          ))}
        </ul>
      </section>}
    </main>
  );
}
