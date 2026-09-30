import { CircleMark } from "@/components/CircleMark";
import "./quiet.css";

export default function NotFound() {
  return (
    <main className="quiet-page">
      <CircleMark className="quiet-mark" />
      <p>This link has closed.</p>
      <p className="quiet-small">If you were expecting to come in, write to Christina and she&apos;ll send you a fresh one.</p>
    </main>
  );
}
