import React from 'react';
import '../../components/Capture/Capture.css';
import '../../components/money/Money.css';
import '../HarvestSheets.css';

/** Same shell as Έξοδο: money-drawer body + sticky footer actions. */
export const HarvestSheetShell: React.FC<{
  children: React.ReactNode;
  footer?: React.ReactNode;
}> = ({ children, footer }) => (
  <div className="money-drawer hc-money-drawer">
    <div className="money-drawer__body">{children}</div>
    {footer ? (
      <div className="money-drawer__footer">
        <div className="money-footer-actions">{footer}</div>
      </div>
    ) : null}
  </div>
);
