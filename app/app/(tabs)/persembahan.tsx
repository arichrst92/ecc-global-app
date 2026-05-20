import { useTranslation } from 'react-i18next';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export default function PersembahanTab() {
  const { t } = useTranslation();
  return (
    <PlaceholderScreen
      title={t('nav.persembahan')}
      milestone="M4"
      msg={t('placeholder.persembahan_msg')}
    />
  );
}
