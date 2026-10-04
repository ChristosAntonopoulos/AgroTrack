import React from 'react';
import RightDrawer from '../../components/Common/RightDrawer';
import '../../components/Capture/Capture.css';
import '../../components/money/Money.css';
import '../HarvestSheets.css';

export const HarvestSheetFrame: React.FC<{
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Sheet kind + day so drawer remounts cleanly when switching actions. */
  resetKey?: string;
  /** Working-day label shown under the title (e.g. Saturday 19 September). */
  kicker?: string;
  subtitle?: string;
  icon?: React.ReactNode;
}> = ({ open, title, onClose, children, resetKey, kicker, subtitle, icon }) => (
  <RightDrawer
    open={open}
    onClose={onClose}
    resetKey={resetKey || title}
    size="md"
    accent
    className="hc-drawer"
    bodyClassName="oa-drawer-body--flush"
    title={title}
    kicker={kicker}
    subtitle={subtitle}
    icon={icon}
  >
    {children}
  </RightDrawer>
);
