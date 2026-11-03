import { inviteMetadata } from "@/lib/invite-page";
import TrustPage, { metadata as publicPage } from "../page";

/** The invite version of Trust, for people Christina invites personally: the same page with Accept invitation, kept out of search. */
export const metadata = inviteMetadata(publicPage, "trust");
export default TrustPage;
