import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import type { PressableProps } from 'react-native';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

type ButtonProps = Omit<PressableProps, 'children'> & {
  label: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
};

const variantClasses: Record<Variant, { bg: string; text: string; pressed: string }> = {
  primary: { bg: 'bg-brand-500', text: 'text-white', pressed: 'opacity-80' },
  secondary: { bg: 'bg-white border border-neutral-200', text: 'text-neutral-900', pressed: 'bg-neutral-50' },
  ghost: { bg: 'bg-transparent', text: 'text-brand-600', pressed: 'opacity-60' },
  danger: { bg: 'bg-red-500', text: 'text-white', pressed: 'opacity-80' },
};

const sizeClasses: Record<Size, { padding: string; text: string; rounded: string }> = {
  sm: { padding: 'px-3 py-2', text: 'text-sm', rounded: 'rounded-lg' },
  md: { padding: 'px-4 py-3', text: 'text-base', rounded: 'rounded-xl' },
  lg: { padding: 'px-5 py-4', text: 'text-base font-semibold', rounded: 'rounded-xl' },
};

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  disabled,
  ...rest
}: ButtonProps) {
  const v = variantClasses[variant];
  const s = sizeClasses[size];
  const isDisabled = disabled || loading;
  return (
    <Pressable
      {...rest}
      disabled={isDisabled}
      className={[
        v.bg,
        s.padding,
        s.rounded,
        fullWidth ? 'w-full' : '',
        'flex-row items-center justify-center gap-2',
        isDisabled ? 'opacity-50' : '',
      ].join(' ')}
      style={({ pressed }) => (pressed && !isDisabled ? { opacity: 0.85 } : undefined)}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'primary' || variant === 'danger' ? '#fff' : '#F97316'} />
      ) : (
        <>
          {leftIcon ? <View>{leftIcon}</View> : null}
          <Text className={`${v.text} ${s.text} font-semibold`}>{label}</Text>
          {rightIcon ? <View>{rightIcon}</View> : null}
        </>
      )}
    </Pressable>
  );
}
