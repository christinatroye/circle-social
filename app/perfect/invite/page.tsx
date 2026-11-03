import { inviteMetadata } from "@/lib/invite-page";
import PerfectPage, { metadata as publicPage } from "../page";

/** The invite version of Perfect, for people Christina invites personally: the same page with Accept invitation, kept out of search. */
export const metadata = inviteMetadata(publicPage, "perfect");
export default PerfectPage;
