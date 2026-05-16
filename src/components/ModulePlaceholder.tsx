import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wrench, ArrowRight, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface Props {
  title: string;
  description: string;
}

export default function ModulePlaceholder({ title, description }: Props) {
  const navigate = useNavigate();
  const { t, dir } = useI18n();

  return (
    <div className="container flex min-h-[calc(100vh-3.5rem)] items-center justify-center py-8" dir={dir}>
      <Card className="relative w-full max-w-lg overflow-hidden border-dashed text-center">
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-primary/10 to-transparent" />

        <CardContent className="relative z-10 flex flex-col items-center gap-5 px-6 py-10">
          <div className="relative flex h-20 w-20 items-center justify-center">
            <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-primary shadow-glow">
              <Wrench className="h-9 w-9 text-primary-foreground" />
            </div>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Loader2 className="h-3 w-3 animate-spin" />
            {t("common.inDevelopment")}
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>

          <div className="rounded-lg border border-border/50 bg-muted/30 p-4 text-sm">
            <p className="font-medium">{t("common.devNotice")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("common.devNoticeBody")}</p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row">
            <Button onClick={() => navigate("/dashboard")} className="flex-1">
              <ArrowRight className="ml-1 h-4 w-4" />
              {t("common.goHome")}
            </Button>
            <Button variant="outline" onClick={() => navigate(-1)} className="flex-1">
              {t("common.back")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
