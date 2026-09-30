import { redirect } from "next/navigation";
import { CircleMark } from "@/components/CircleMark";
import { isHostAuthenticated } from "@/lib/host-auth.server";
import { LoginForm } from "./LoginForm";
import "../host/host.css";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await isHostAuthenticated()) redirect("/host");
  return (
    <main className="host-page host-login-page">
      <CircleMark className="host-mark" />
      <h1>Host</h1>
      <LoginForm />
    </main>
  );
}
