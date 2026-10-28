import { FlaskConical } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/Icon";
import { scenarioGroups, type ScenarioId } from "./scenarios";
import { currentScenario, scenarioUrl } from "./scenario-state";

interface ScenarioSwitcherProps {
  onSelect?: (id: ScenarioId) => void;
}

const reload = (id: ScenarioId) => {
  window.location.assign(scenarioUrl(id, window.location.href));
};

// Development only (loaded behind import.meta.env.DEV in App.tsx). Picking a scenario reloads
// the page with ?scenario=<id>, so the mock db starts fresh for it. Top right: the header and
// the entry screen keep that corner free; the bottom holds actions and navigation.
export function ScenarioSwitcher({ onSelect = reload }: ScenarioSwitcherProps) {
  const { t } = useTranslation();
  const id = useId();
  const active = currentScenario();

  return (
    <details className="fixed top-[calc(0.5rem+env(safe-area-inset-top))] right-3 z-40 max-w-[calc(100vw-1.5rem)] rounded-control border border-gray-200 bg-paper shadow-overlay">
      <summary className="type-caption flex min-h-9 cursor-pointer items-center gap-1.5 px-3 font-semibold text-navy-900">
        <Icon icon={FlaskConical} size={16} />
        {active}
      </summary>
      <div className="flex flex-col gap-1.5 border-t border-gray-200 p-3">
        <label htmlFor={id} className="type-caption text-gray-600">
          {t("dev.scenarios.label")}
        </label>
        <select
          id={id}
          value={active}
          onChange={(event) => {
            onSelect(event.target.value as ScenarioId);
          }}
          className="type-body rounded-control border border-gray-500 bg-paper px-2 py-1.5"
        >
          {scenarioGroups.map(({ group, ids }) => (
            <optgroup key={group} label={t(`dev.scenarios.groups.${group}`)}>
              {ids.map((scenario) => (
                <option key={scenario} value={scenario}>
                  {scenario}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
    </details>
  );
}
