import { ChevronDown } from "lucide-react";
import { Accordion } from "radix-ui";
import { useTranslation } from "react-i18next";
import type { AppConfig, Locale } from "@/api/types";
import { Icon } from "@/components/Icon";
import { formatMoney } from "@/lib/money";

const questions = [
  "custody",
  "cost",
  "minimum",
  "window",
  "opening",
  "wrongNetwork",
  "withdraw",
] as const;

// T13. One answer open at a time; the minimum and the window day come from GET /config.
// TODO(compliance): every answer here is pending legal review (PRD section 10). None may promise
// returns, legality in the client's country, or tax or succession protection.
export function FaqList({ config, locale }: { config: AppConfig; locale: Locale }) {
  const { t } = useTranslation("profile");
  const values = {
    min: formatMoney(config.minRecurringUsdCents, locale),
    day: config.investmentWindowDay,
  };

  return (
    <Accordion.Root type="single" collapsible className="border-y border-gray-200">
      {questions.map((question) => (
        <Accordion.Item
          key={question}
          value={question}
          className="border-t border-gray-200 first:border-t-0"
        >
          <Accordion.Header className="flex">
            <Accordion.Trigger className="group type-body flex min-h-12 font-semibold flex-1 items-center justify-between gap-4 py-3 text-left text-graphite-900 hover:bg-paper">
              {t(`help.questions.${question}.q`)}
              <Icon
                icon={ChevronDown}
                size={16}
                className="shrink-0 text-gray-600 transition-transform duration-fast group-data-[state=open]:rotate-180 motion-reduce:transition-none"
              />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="type-body max-w-prose pb-4 text-graphite-900">
            {t(`help.questions.${question}.a`, values)}
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}
