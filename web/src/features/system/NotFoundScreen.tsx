import { useNavigate } from "react-router";
import { AppShell } from "@/components/AppShell";
import { NotFoundState } from "@/components/PageState";
import { paths } from "@/routes";

export function NotFoundScreen() {
  const navigate = useNavigate();
  return (
    <AppShell>
      <NotFoundState onHome={() => void navigate(paths.entry)} />
    </AppShell>
  );
}
