import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { ThreePaneLayout } from './ThreePaneLayout';

describe('ThreePaneLayout', () => {
  it('should render three panes', () => {
    render(
      <ThreePaneLayout
        leftPane={<div data-testid="left">Left</div>}
        centerPane={<div data-testid="center">Center</div>}
        rightPane={<div data-testid="right">Right</div>}
      />
    );

    expect(screen.getByTestId('left')).toBeInTheDocument();
    expect(screen.getByTestId('center')).toBeInTheDocument();
    expect(screen.getByTestId('right')).toBeInTheDocument();
  });

  it('should have correct layout structure', () => {
    const { container } = render(
      <ThreePaneLayout
        leftPane={<div>Left</div>}
        centerPane={<div>Center</div>}
        rightPane={<div>Right</div>}
      />
    );

    const layout = container.querySelector('.three-pane-layout');
    expect(layout).toBeInTheDocument();
    expect(layout?.children).toHaveLength(3);
  });

  it('should apply className to left pane', () => {
    const { container } = render(
      <ThreePaneLayout
        leftPane={<div>Left</div>}
        centerPane={<div>Center</div>}
        rightPane={<div>Right</div>}
      />
    );

    expect(container.querySelector('.left-pane')).toBeInTheDocument();
    expect(container.querySelector('.center-pane')).toBeInTheDocument();
    expect(container.querySelector('.right-pane')).toBeInTheDocument();
  });
});
