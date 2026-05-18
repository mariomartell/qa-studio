import { PageHeader } from "@/components/app-shell/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { BarChart3 } from "lucide-react";

export default function ReportsPage() {
  return (
    <>
      <PageHeader
        title="Reports"
        description="Pass/fail charts, defect breakdowns, release readiness."
      />
      <Card>
        <CardBody>
          <EmptyState
            icon={<BarChart3 size={32} />}
            title="Reports land in Phase 3"
            description="Pass/fail donut per run, defects by severity, suite coverage, release readiness."
          />
        </CardBody>
      </Card>
    </>
  );
}
