import * as React from 'react';
import { ReactNode } from 'react';

interface ThreePaneLayoutProps {
  leftPane: ReactNode;
  centerPane: ReactNode;
  rightPane: ReactNode;
}

export function ThreePaneLayout({ leftPane, centerPane, rightPane }: ThreePaneLayoutProps) {
  return (
    <div className="three-pane-layout">
      <div className="left-pane">{leftPane}</div>
      <div className="center-pane">{centerPane}</div>
      <div className="right-pane">{rightPane}</div>
    </div>
  );
}
