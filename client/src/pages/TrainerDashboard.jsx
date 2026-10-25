import FeatureWorkspace from '../components/FeatureWorkspace';

export default function TrainerDashboard() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-3xl font-black">Trainer workspace</h1>
      <FeatureWorkspace mode="staff" />
    </main>
  );
}
