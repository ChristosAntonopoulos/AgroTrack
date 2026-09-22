import React from 'react';
import RightDrawer, { RightDrawerSize } from '../Common/RightDrawer';

type Props = {
  open?: boolean;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  kicker?: React.ReactNode;
  icon?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  footerClassName?: string;
  size?: RightDrawerSize;
};

/** Shared right drawer / mobile sheet for partner forms. */
const PartnersSheet: React.FC<Props> = ({
  open = true,
  title,
  subtitle,
  kicker,
  icon,
  onClose,
  children,
  footer,
  footerClassName,
  size = 'md',
}) => (
  <RightDrawer
    open={open}
    onClose={onClose}
    title={title}
    subtitle={subtitle}
    kicker={kicker}
    icon={icon}
    footer={footer}
    footerClassName={footerClassName}
    size={size}
    bodyClassName="partners-sheet-body"
  >
    {children}
  </RightDrawer>
);

export default PartnersSheet;
