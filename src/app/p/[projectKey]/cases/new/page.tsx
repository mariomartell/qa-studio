import { redirect } from "next/navigation";

export default async function NewCasePage({
  params,
  searchParams,
}: {
  params: Promise<{ projectKey: string }>;
  searchParams: Promise<{ folder?: string }>;
}) {
  const { projectKey } = await params;
  const { folder } = await searchParams;
  const qs = folder ? `?folder=${folder}` : "";
  redirect(`/p/${projectKey}/repository/new${qs}`);
}
