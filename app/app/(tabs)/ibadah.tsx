import { useTranslation } from 'react-i18next';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export default function IbadahTab() {
  const { t } = useTranslation();
  return (
    <PlaceholderScreen
      title={t('nav.ibadah')}
      milestone="M2.4"
      msg={t('placeholder.ibadah_msg')}
    />
  );
}
