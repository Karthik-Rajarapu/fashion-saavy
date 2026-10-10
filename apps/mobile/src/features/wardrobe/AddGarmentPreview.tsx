import { useRouter } from 'expo-router';
import { FlowPreview } from '../../ui/FlowPreview';

export function AddGarmentPreview() {
  const router = useRouter();
  return (
    <FlowPreview
      kicker="Add a garment"
      title="One photo, then you confirm."
      intro="Adding a piece takes a single photo. We suggest the details; you have the final say."
      steps={[
        { title: 'Photograph one piece', detail: 'Lay it flat or hang it, in daylight, on a plain background.' },
        { title: 'We suggest the details', detail: 'Type, colour, fit and occasion, clearly marked as suggestions.' },
        { title: 'You confirm or correct', detail: 'One tap to fix anything. What you confirm is what the Stylist uses.' },
      ]}
      notes={[
        'Clothing only for now. Shoes are coming later.',
        'We ask for camera access only when you take your first photo.',
      ]}
      onClose={() => router.back()}
    />
  );
}
