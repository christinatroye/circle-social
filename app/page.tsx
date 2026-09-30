import { CircleMark } from "@/components/CircleMark";
import "./quiet.css";

export default function Home() {
  return (
    <main className="quiet-page">
      <CircleMark className="quiet-mark" />
      <p>Circle gathers by invitation.</p>
    </main>
  );
}
