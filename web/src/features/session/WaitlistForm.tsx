import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { errorMessageKey } from "@/api/error-messages";
import { useJoinWaitlist } from "@/api/hooks/account";
import { Banner } from "@/components/Banner";
import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { Input } from "@/components/Input";

const waitlistForm = z.object({ email: z.email() });
type WaitlistFormValues = z.infer<typeof waitlistForm>;

interface WaitlistFormProps {
  defaultEmail: string;
  // ISO 3166-1 alpha-2 (docs/api-gaps.md, item 1).
  country: string;
}

// Email only; used by T1 (country outside liveMarkets) and onboarding step 1.
export function WaitlistForm({ defaultEmail, country }: WaitlistFormProps) {
  const { t } = useTranslation();
  const join = useJoinWaitlist();
  const form = useForm<WaitlistFormValues>({
    resolver: zodResolver(waitlistForm),
    defaultValues: { email: defaultEmail },
  });

  const submit = form.handleSubmit(({ email }) => {
    join.mutate({ email, country });
  });

  if (join.isSuccess) {
    return <Banner tone="info" title={t("waitlist.done", { email: join.variables.email })} />;
  }

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
      <Field
        label={t("waitlist.emailLabel")}
        error={form.formState.errors.email ? t("waitlist.invalidEmail") : undefined}
      >
        <Input type="email" autoComplete="email" inputMode="email" {...form.register("email")} />
      </Field>
      {join.isError && <Banner tone="error" title={t(errorMessageKey(join.error))} />}
      <Button type="submit" loading={join.isPending}>
        {t("waitlist.submit")}
      </Button>
    </form>
  );
}
