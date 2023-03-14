import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

it('renders title', () => {
  render(App());
  expect(screen.getByText('SecureSECO Verification')).toBeInTheDocument();
});
