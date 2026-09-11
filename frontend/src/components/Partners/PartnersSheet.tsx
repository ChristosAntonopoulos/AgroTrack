import React from 'react';
import RightDrawer from '../Common/RightDrawer';

type Props = {
  open?: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

/** Shared right drawer / mobile sheet for partner forms. */
const PartnersSheet: React.FC<Props> = ({
  open = true,
  title,
  subtitle,
  onClose,
  children,
  footer,
}) => (
  <RightDrawer
    open={open}
    onClose={onClose}
    title={title}
    subtitle={subtitle}
    footer={footer}
    size="md"
    bodyClassName="partners-sheet-body"
  >
    {children}
  </RightDrawer>
);

export default PartnersSheet;
