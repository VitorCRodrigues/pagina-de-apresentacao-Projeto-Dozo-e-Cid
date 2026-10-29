import { CircleAlert, FileText } from "lucide-react";
import { useEffect, useId, useRef, useState, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { errorMessageKey } from "@/api/error-messages";
import type { PendingItem } from "@/api/types";
import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { asLocale, toIntlLocale } from "@/lib/locale";
import {
  ACCEPT_ATTRIBUTE,
  documentProblem,
  formatFileSize,
  isImage,
  type DocumentProblem,
} from "./document-rules";

interface DocumentUploadProps {
  item: PendingItem;
  // Sends the file; onProgress gets 0–1. The screen wires it to POST /account/documents.
  upload: (file: File, onProgress: (fraction: number) => void) => Promise<unknown>;
}

// One document Interactive Brokers asked for: pick a file, check it, preview it, send it.
// A statement line like the rest of the screen; progress is a thin bar, as in the Stepper.
export function DocumentUpload({ item, upload }: DocumentUploadProps) {
  const { t, i18n } = useTranslation();
  const inputId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [problem, setProblem] = useState<DocumentProblem | null>(null);
  const [percent, setPercent] = useState<number | null>(null);
  const [sendError, setSendError] = useState<unknown>(null);
  const urlRef = useRef<string | null>(null);

  // The preview URL holds the file in memory until revoked.
  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  function choose(event: ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.[0];
    event.target.value = "";
    if (!chosen) return;
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setSendError(null);
    setPercent(null);

    const found = documentProblem(chosen);
    setProblem(found);
    setFile(found ? null : chosen);
    if (!found && isImage(chosen)) urlRef.current = URL.createObjectURL(chosen);
    setPreviewUrl(urlRef.current);
  }

  async function send() {
    if (!file || percent !== null) return;
    setSendError(null);
    setPercent(0);
    try {
      await upload(file, (fraction) => {
        setPercent(Math.round(fraction * 100));
      });
      // Sent: the item usually leaves the list; if it stays, the row is ready for another file.
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
      setPreviewUrl(null);
      setFile(null);
      setPercent(null);
    } catch (error) {
      setPercent(null);
      setSendError(error);
    }
  }

  const sending = percent !== null;

  return (
    <li className="flex flex-col gap-3 border-t border-gray-200 py-5 first:border-t-0">
      <div className="flex flex-col gap-1">
        <p className="type-label text-graphite-900">{item.title}</p>
        <p className="type-caption text-gray-600">{item.description}</p>
      </div>

      {file && (
        <div className="flex items-center gap-3">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt={t("account.upload.preview", { name: file.name })}
              className="h-20 w-auto max-w-32 rounded-control border border-gray-200 object-cover"
            />
          ) : (
            <Icon icon={FileText} size={20} className="shrink-0 text-gray-600" />
          )}
          <div className="flex min-w-0 flex-col">
            <span className="type-body truncate text-graphite-900">{file.name}</span>
            <span className="type-caption text-gray-600 tabular-nums">
              {formatFileSize(file.size, toIntlLocale(asLocale(i18n.language)))}
            </span>
          </div>
        </div>
      )}

      {sending && (
        <div
          role="progressbar"
          aria-label={t("account.upload.progress")}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="h-1 w-full overflow-hidden rounded-full bg-gray-200"
        >
          <div
            className="h-full rounded-full bg-navy-900 transition-[width] duration-base ease-od"
            style={{ width: `${String(percent)}%` }}
          />
        </div>
      )}

      {(problem ?? sendError) !== null && (
        <p className="type-caption flex items-start gap-1.5 text-brick-700">
          <Icon icon={CircleAlert} size={16} className="mt-px shrink-0" />
          {problem ? t(`account.upload.${problem}`) : t(errorMessageKey(sendError))}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {file && (
          <Button variant="secondary" loading={sending} onClick={() => void send()}>
            {t("account.upload.send")}
          </Button>
        )}
        {!sending && (
          <label
            htmlFor={inputId}
            className="type-label cursor-pointer text-green-700 underline decoration-1 underline-offset-4 hover:decoration-2 has-[:focus-visible]:outline-2"
          >
            {file ? t("account.upload.change") : t("account.upload.choose")}
            <input
              id={inputId}
              type="file"
              accept={ACCEPT_ATTRIBUTE}
              onChange={choose}
              className="sr-only"
            />
          </label>
        )}
      </div>
      {!file && <p className="type-caption text-gray-600">{t("account.upload.accepted")}</p>}
    </li>
  );
}
