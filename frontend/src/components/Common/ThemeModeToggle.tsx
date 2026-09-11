import React from 'react';
import { useTranslation } from 'react-i18next';
import { Monitor, Sun, Moon } from 'lucide-react';
import { useTheme, type Theme } from '../../context/ThemeContext';
import './ThemeModeToggle.css';

const OPTIONS: { value: Theme; Icon: typeof Sun }[] = [
  { value: 'system', Icon: Monitor },
  { value: 'light', Icon: Sun },
  { value: 'dark', Icon: Moon },
];

type Props = {
  /** Visual surface: auth chrome, landing hero, or neutral app chrome. */
  surface?: 'auth' | 'landing' | 'landing-scrolled' | 'default';
  className?: string;
};

const ThemeModeToggle: React.FC<Props> = ({ surface = 'default', className }) => {
  const { t } = useTranslation('settings');
  const { theme, setTheme } = useTheme();

  return (
    <div
      className={[
        'theme-mode-toggle',
        `theme-mode-toggle--${surface}`,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role="group"
      aria-label={t('appearance.theme')}
    >
      {OPTIONS.map(({ value, Icon }) => {
        const active = theme === value;
        const label = t(`appearance.themes.${value}`);
        return (
          <button
            key={value}
            type="button"
            className={`theme-mode-toggle-btn${active ? ' is-active' : ''}`}
            onClick={() => setTheme(value)}
            aria-pressed={active}
            aria-label={label}
            title={label}
          >
            <Icon size={15} strokeWidth={active ? 2.25 : 1.9} aria-hidden />
          </button>
        );
      })}
    </div>
  );
};

export default ThemeModeToggle;
