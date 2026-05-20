import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { FamilyRole } from '@/types/family';

const ROLES: FamilyRole[] = ['SPOUSE', 'CHILD', 'PARENT', 'SIBLING'];

function roleLabel(role: FamilyRole, t: (k: string) => string): string {
  switch (role) {
    case 'SPOUSE':
      return t('family.role_spouse');
    case 'CHILD':
      return t('family.role_child');
    case 'PARENT':
      return t('family.role_parent');
    case 'SIBLING':
      return t('family.role_sibling');
  }
}

export function RolePicker({
  value,
  onChange,
  disabled,
}: {
  value: FamilyRole | null;
  onChange: (role: FamilyRole) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <View>
      <Text className="text-xs font-medium text-neutral-600 mb-2">
        {t('family.role_label')}
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {ROLES.map((r) => {
          const active = value === r;
          return (
            <Pressable
              key={r}
              onPress={() => !disabled && onChange(r)}
              className={`px-4 py-2 rounded-full border ${
                active
                  ? 'bg-brand-500 border-brand-500'
                  : 'bg-white border-neutral-200'
              } ${disabled ? 'opacity-50' : ''}`}
            >
              <Text
                className={`text-sm font-semibold ${
                  active ? 'text-white' : 'text-neutral-700'
                }`}
              >
                {roleLabel(r, t)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
