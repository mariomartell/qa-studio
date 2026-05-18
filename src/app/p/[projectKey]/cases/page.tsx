import { redirect } from "next/navigation";

export default async function CasesPage({
  params,
}: {
  params: Promise<{ projectKey: string }>;
}) {
  const { projectKey } = await params;
  redirect(`/p/${projectKey}/repository`);
}
