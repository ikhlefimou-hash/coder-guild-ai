import { BadgeCheck } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function VerifiedBadge({ className = "" }: { className?: string }) {
  const { t } = useI18n();
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary ${className}`}
      title={t("verify.badge")}
    >
      <BadgeCheck className="h-3 w-3" />
      {t("verify.badge")}
    </span>
  );
}
