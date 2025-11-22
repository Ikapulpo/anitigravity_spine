import Dashboard from "@/components/Dashboard";
import { fetchPatients } from "@/services/dataService";

export const revalidate = 3600; // Revalidate every hour

export default async function Home() {
  const patients = await fetchPatients();
  return <Dashboard patients={patients} />;
}
