import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { z } from "zod";
import { useAuth } from "@/api/auth-context";
import { errorMessageKey } from "@/api/error-messages";
import { useJoinWaitlist } from "@/api/hooks/account";
import type { Me } from "@/api/types";
import { Banner } from "@/components/Banner";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { Input } from "@/components/Input";
import { paths } from "@/routes";

const waitlistForm = z.object({ email: z.email() });
type WaitlistForm = z.infer<typeof waitlistForm>;

// T1, country outside config.liveMarkets: waitlist with the email only.
export function NotAvailableScreen({ me }: { me: Me }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const join = useJoinWaitlist();
  const form = useForm<WaitlistForm>({
    resolver: zodResolver(waitlistForm),
    defaultValues: { email: me.email },
  });

  const submit = form.handleSubmit(({ email }) => {
    join.mutate({ email, country: me.country });
  });

  return (
    <section className="flex flex-col gap-6 py-6">
      <div className="flex flex-col gap-3">
        <h1 className="type-title text-navy-900">{t("waitlist.title")}</h1>
        <p className="type-body text-gray-600">{t("waitlist.body")}</p>
      </div>

      {join.isSuccess ? (
        <Banner tone="info" title={t("waitlist.done", { email: join.variables.email })} />
      ) : (
        <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
          <Field
            label={t("waitlist.emailLabel")}
            error={form.formState.errors.email ? t("waitlist.invalidEmail") : undefined}
          >
            <Input
              type="email"
              autoComplete="email"
              inputMode="email"
              {...form.register("email")}
            />
          </Field>
          {join.isError && <Banner tone="error" title={t(errorMessageKey(join.error))} />}
          <Button type="submit" loading={join.isPending}>
            {t("waitlist.submit")}
          </Button>
        </form>
      )}

      <Button
        variant="ghost"
        fullWidth="never"
        className="self-start"
        onClick={() => {
          void logout();
          void navigate(paths.entry, { replace: true });
        }}
      >
        {t("waitlist.signOut")}
      </Button>
    </section>
  );
}
