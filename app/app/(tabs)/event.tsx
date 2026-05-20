import { useTranslation } from 'react-i18next';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export default function EventTab() {
  const { t } = useTranslation();
  return (
    <PlaceholderScreen
      title={t('nav.event')}
      milestone="M3"
      msg={t('placeholder.event_msg')}
    />
  );
}
