import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampTutorialStepIndex,
  shouldAutoShowTutorial,
  TUTORIAL_STEPS,
} from './onboardingTutorial';

test('TUTORIAL_STEPS covers the complete 4-step center workflow in order', () => {
  assert.equal(TUTORIAL_STEPS.length, 4);
  assert.deepEqual(
    TUTORIAL_STEPS.map((step) => step.stepNumber),
    [1, 2, 3, 4]
  );
  assert.deepEqual(
    TUTORIAL_STEPS.map((step) => step.actionTarget),
    ['settings', 'new_student', 'schedule', 'attendance']
  );

  for (const step of TUTORIAL_STEPS) {
    assert.ok(step.shortTitle.trim().length > 0 && step.shortTitle.length <= 20);
    assert.ok(step.title.trim().length > 0);
    assert.ok(step.summary.trim().length > 0);
    assert.ok(step.checklist.length >= 2);
    assert.ok(step.outcome.trim().length > 0);
    assert.ok(step.actionLabel.trim().length > 0);
  }
});

test('shouldAutoShowTutorial opens automatically only on clean first visit', () => {
  assert.equal(
    shouldAutoShowTutorial({
      hasCompletedTutorial: false,
      studentsCount: 0,
      groupsCount: 0,
      sessionsCount: 0,
    }),
    true
  );
});

test('shouldAutoShowTutorial stays hidden when already completed or when data exists', () => {
  assert.equal(
    shouldAutoShowTutorial({
      hasCompletedTutorial: true,
      studentsCount: 0,
      groupsCount: 0,
      sessionsCount: 0,
    }),
    false
  );

  assert.equal(
    shouldAutoShowTutorial({
      hasCompletedTutorial: false,
      studentsCount: 1,
      groupsCount: 0,
      sessionsCount: 0,
    }),
    false
  );

  assert.equal(
    shouldAutoShowTutorial({
      hasCompletedTutorial: false,
      studentsCount: 0,
      groupsCount: 1,
      sessionsCount: 0,
    }),
    false
  );

  assert.equal(
    shouldAutoShowTutorial({
      hasCompletedTutorial: false,
      studentsCount: 0,
      groupsCount: 0,
      sessionsCount: 1,
    }),
    false
  );
});

test('shouldAutoShowTutorial respects ?autostart=1 override', () => {
  assert.equal(
    shouldAutoShowTutorial({
      hasCompletedTutorial: false,
      studentsCount: 0,
      groupsCount: 0,
      sessionsCount: 0,
      search: '?autostart=1',
    }),
    false
  );

  assert.equal(
    shouldAutoShowTutorial({
      hasCompletedTutorial: false,
      studentsCount: 0,
      groupsCount: 0,
      sessionsCount: 0,
      search: '?tab=overview&autostart=0',
    }),
    true
  );
});

test('clampTutorialStepIndex clamps within valid step bounds', () => {
  assert.equal(clampTutorialStepIndex(-2, 4), 0);
  assert.equal(clampTutorialStepIndex(0, 4), 0);
  assert.equal(clampTutorialStepIndex(2, 4), 2);
  assert.equal(clampTutorialStepIndex(99, 4), 3);
  assert.equal(clampTutorialStepIndex(Number.NaN, 4), 0);
});
