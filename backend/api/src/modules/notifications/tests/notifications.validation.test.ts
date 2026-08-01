import { describe, expect, it } from 'vitest';

import { canTransition } from '../domain/state-machine';
import { extractVariables, missingVariables, render } from '../templates/render';
import { createNotificationSchema, createTemplateSchema } from '../validators';

describe('template rendering', () => {
  it('extracts and substitutes variables', () => {
    const body = 'Hi {{name}}, you earned {{points}} points.';
    expect(extractVariables(body).sort()).toEqual(['name', 'points']);
    expect(render(body, { name: 'Sam', points: 500 })).toBe('Hi Sam, you earned 500 points.');
  });

  it('renders unknown placeholders as empty and reports missing', () => {
    expect(render('Hello {{who}}!', {})).toBe('Hello !');
    expect(missingVariables(['who', 'x'], { x: 'y' })).toEqual(['who']);
  });
});

describe('delivery state machine', () => {
  it('permits only valid transitions', () => {
    expect(canTransition('DRAFT', 'QUEUED')).toBe(true);
    expect(canTransition('QUEUED', 'SENDING')).toBe(true);
    expect(canTransition('SENDING', 'SENT')).toBe(true);
    expect(canTransition('SENT', 'DELIVERED')).toBe(true);
    expect(canTransition('FAILED', 'QUEUED')).toBe(true);
    expect(canTransition('DELIVERED', 'SENT')).toBe(false);
    expect(canTransition('CANCELLED', 'QUEUED')).toBe(false);
    expect(canTransition('DRAFT', 'DELIVERED')).toBe(false);
  });
});

describe('notification validators', () => {
  it('uppercases template code and requires channel + body', () => {
    expect(
      createTemplateSchema.parse({ code: 'welcome', name: 'W', channel: 'IN_APP', body: 'Hi' })
        .code,
    ).toBe('WELCOME');
    expect(
      createTemplateSchema.safeParse({ code: 'w', name: 'W', channel: 'IN_APP', body: 'Hi' })
        .success,
    ).toBe(false);
  });

  it('requires a recipient and content', () => {
    expect(createNotificationSchema.safeParse({ channel: 'IN_APP', body: 'Hi' }).success).toBe(
      false,
    );
    expect(
      createNotificationSchema.safeParse({
        recipientUserId: '00000000-0000-0000-0000-000000000001',
      }).success,
    ).toBe(false);
    expect(
      createNotificationSchema.safeParse({
        recipientUserId: '00000000-0000-0000-0000-000000000001',
        channel: 'IN_APP',
        body: 'Hi',
      }).success,
    ).toBe(true);
  });
});
