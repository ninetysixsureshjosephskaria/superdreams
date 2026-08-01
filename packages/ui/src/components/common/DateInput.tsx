import { forwardRef } from 'react';

import { Input, type InputProps } from './Input';

export type DateInputProps = Omit<InputProps, 'type'>;

/**
 * Date field built on the native date control (dependency-free, fully
 * accessible, locale-aware). A richer calendar picker can layer on later.
 */
export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(
  function DateInput(props, ref) {
    return <Input ref={ref} type="date" {...props} />;
  },
);
