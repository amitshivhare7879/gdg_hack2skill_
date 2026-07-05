import ClustersView from "@/components/ClustersView";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ locality?: string }>;
}) {
  const { locality } = await searchParams;
  return <ClustersView locality={locality} />;
}
