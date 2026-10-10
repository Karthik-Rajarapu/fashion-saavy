import { useRouter } from 'expo-router';
import { FlowPreview } from '../../ui/FlowPreview';

export function QuestionnairePreview() {
  const router = useRouter();
  return (
    <FlowPreview
      kicker="Style questionnaire"
      title="Find your style direction."
      intro="A short, visual set of choices. No forms, no right answers."
      steps={[
        { title: 'Pick looks you would wear', detail: 'Choose between aesthetics and silhouettes, image by image.' },
        { title: 'Colours, fit and comfort', detail: 'What you reach for, and what you avoid.' },
        { title: 'Where you dress for', detail: 'College, weekends, festive days, and the rest of your week.' },
        { title: 'Meet your Style Profile', detail: 'A short summary you should recognize yourself in.' },
      ]}
      notes={['Your answers become a summary, not a list of settings. To change it later, you retake the questionnaire.']}
      onClose={() => router.back()}
    />
  );
}
