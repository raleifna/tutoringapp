import React from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import LocationCascader from '../LocationCascader';

const options = [
  {
    label: 'NSW',
    value: 'nsw',
    children: [
      { label: 'Sydney', value: 'sydney' },
      { label: 'Newcastle', value: 'newcastle' },
    ],
  },
  {
    label: 'VIC',
    value: 'vic',
    children: [{ label: 'Melbourne', value: 'melbourne' }],
  },
];

describe('LocationCascader component', () => {
  afterEach(() => {
    cleanup();
  });

  test('renders the placeholder, opens the cascader, and emits the selected leaf value', async () => {
    const onChange = vi.fn();

    render(
      <LocationCascader
        value=""
        onChange={onChange}
        options={options}
        placeholder="Choose a suburb"
      />
    );

    expect(screen.getByText('Choose a suburb')).toBeTruthy();

    fireEvent.click(screen.getByText('Choose a suburb'));
    fireEvent.click(screen.getByText('NSW'));
    fireEvent.click(screen.getByText('Sydney'));

    expect(onChange).toHaveBeenCalledWith(
      'Sydney',
      expect.arrayContaining([
        expect.objectContaining({ label: 'NSW' }),
        expect.objectContaining({ label: 'Sydney' }),
      ])
    );
    expect(screen.getByText('NSW / Sydney')).toBeTruthy();
  });

  test('resolves an existing value and closes when the user clicks outside', async () => {
    render(
      <div>
        <button type="button">Outside</button>
        <LocationCascader value="Sydney" onChange={vi.fn()} options={options} />
      </div>
    );

    expect(screen.getByText('NSW / Sydney')).toBeTruthy();

    fireEvent.click(screen.getByText('NSW / Sydney'));
    expect(screen.getByText('Newcastle')).toBeTruthy();

    fireEvent.mouseDown(screen.getByRole('button', { name: 'Outside' }));
    expect(screen.queryByText('Newcastle')).toBeNull();
  });
});
