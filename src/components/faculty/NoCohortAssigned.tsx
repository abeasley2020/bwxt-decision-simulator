/**
 * Empty state shown on faculty surfaces when the viewer is not assigned to a
 * non-draft cohort.
 */

interface Props {
  description?: string;
}

export default function NoCohortAssigned({
  description = "Contact your administrator to be assigned to a cohort.",
}: Props) {
  return (
    <main className="max-w-6xl mx-auto px-6 py-16 text-center">
      <h1 className="text-2xl font-bold text-brand-navy mb-3">
        No Cohort Assigned
      </h1>
      <p className="text-gray-500 text-sm max-w-sm mx-auto">{description}</p>
    </main>
  );
}
