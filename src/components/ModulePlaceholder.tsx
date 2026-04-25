import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Construction } from "lucide-react";

interface Props {
  title: string;
  description: string;
}

export default function ModulePlaceholder({ title, description }: Props) {
  return (
    <div className="container py-6" dir="rtl">
      <Card className="border-dashed">
        <CardHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
            <Construction className="h-5 w-5 text-muted-foreground" />
          </div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            هذه الوحدة قيد التطوير. سيتم تفعيلها في المراحل القادمة.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
