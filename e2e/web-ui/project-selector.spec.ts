import { test, expect } from '@playwright/test';
import {
  runCapture,
  cleanupTestProject,
  generateTestProjectName,
  TEST_URL,
} from '../fixtures/test-utils';

test.describe('Project Selector UI', () => {
  const testProjects: string[] = [];

  test.beforeAll(async () => {
    // Create two test projects for the UI tests
    for (let i = 0; i < 2; i++) {
      const projectName = generateTestProjectName(`ui-test-${i}`);
      testProjects.push(projectName);

      await runCapture([
        '--url', TEST_URL,
        '--name', projectName,
        '--flow', `Flow ${i + 1}`,
        '--headless',
      ]);

      // Add a second flow to the first project
      if (i === 0) {
        await runCapture([
          '--url', TEST_URL,
          '--name', projectName,
          '--flow', 'Second Flow',
          '--headless',
        ]);
      }
    }
  });

  test.afterAll(async () => {
    // Clean up test projects
    for (const projectName of testProjects) {
      await cleanupTestProject(projectName);
    }
  });

  test('displays project selector', async ({ page }) => {
    await page.goto('/');

    const selector = page.getByTestId('project-selector');
    await expect(selector).toBeVisible();
  });

  test('opens dropdown on click', async ({ page }) => {
    await page.goto('/');

    const selectorButton = page.getByTestId('project-selector-button');
    await expect(selectorButton).toBeVisible();

    await selectorButton.click();

    const dropdown = page.getByTestId('project-dropdown');
    await expect(dropdown).toBeVisible();
  });

  test('shows all projects in dropdown', async ({ page }) => {
    await page.goto('/');

    const selectorButton = page.getByTestId('project-selector-button');
    await selectorButton.click();

    const dropdown = page.getByTestId('project-dropdown');
    await expect(dropdown).toBeVisible();

    // Check that both test projects are visible
    for (const projectName of testProjects) {
      const projectOption = page.getByTestId(`project-option-${projectName}`);
      await expect(projectOption).toBeVisible();
    }
  });

  test('switches project on selection', async ({ page }) => {
    await page.goto('/');

    const selectorButton = page.getByTestId('project-selector-button');

    // Open dropdown
    await selectorButton.click();

    // Select the second test project
    const projectOption = page.getByTestId(`project-option-${testProjects[1]}`);
    await projectOption.click();

    // Verify dropdown closed and project is selected
    const dropdown = page.getByTestId('project-dropdown');
    await expect(dropdown).not.toBeVisible();

    // Verify button shows selected project
    await expect(selectorButton).toContainText(testProjects[1]);
  });

  test('closes dropdown on outside click', async ({ page }) => {
    await page.goto('/');

    const selectorButton = page.getByTestId('project-selector-button');
    await selectorButton.click();

    const dropdown = page.getByTestId('project-dropdown');
    await expect(dropdown).toBeVisible();

    // Click outside the dropdown
    await page.click('main');

    await expect(dropdown).not.toBeVisible();
  });

  test('closes dropdown on Escape key', async ({ page }) => {
    await page.goto('/');

    const selectorButton = page.getByTestId('project-selector-button');
    await selectorButton.click();

    const dropdown = page.getByTestId('project-dropdown');
    await expect(dropdown).toBeVisible();

    // Press Escape
    await page.keyboard.press('Escape');

    await expect(dropdown).not.toBeVisible();
  });

  test('shows flow count per project', async ({ page }) => {
    await page.goto('/');

    const selectorButton = page.getByTestId('project-selector-button');
    await selectorButton.click();

    // The first project should show 2 flows
    const firstProjectOption = page.getByTestId(`project-option-${testProjects[0]}`);
    await expect(firstProjectOption).toContainText('2 flows');

    // The second project should show 1 flow
    const secondProjectOption = page.getByTestId(`project-option-${testProjects[1]}`);
    await expect(secondProjectOption).toContainText('1 flow');
  });

  test('shows delete button for each project', async ({ page }) => {
    await page.goto('/');

    const selectorButton = page.getByTestId('project-selector-button');
    await selectorButton.click();

    for (const projectName of testProjects) {
      const deleteButton = page.getByTestId(`delete-project-${projectName}`);
      await expect(deleteButton).toBeVisible();
    }
  });

  test('opens delete modal when delete button is clicked', async ({ page }) => {
    await page.goto('/');

    const selectorButton = page.getByTestId('project-selector-button');
    await selectorButton.click();

    const deleteButton = page.getByTestId(`delete-project-${testProjects[0]}`);
    await deleteButton.click();

    const deleteModal = page.getByTestId('delete-project-modal');
    await expect(deleteModal).toBeVisible();
  });

  test('delete modal requires typing project name to confirm', async ({ page }) => {
    await page.goto('/');

    const selectorButton = page.getByTestId('project-selector-button');
    await selectorButton.click();

    const deleteButton = page.getByTestId(`delete-project-${testProjects[0]}`);
    await deleteButton.click();

    const deleteModal = page.getByTestId('delete-project-modal');
    await expect(deleteModal).toBeVisible();

    // Confirm button should be disabled initially
    const confirmButton = page.getByTestId('delete-confirm-button');
    await expect(confirmButton).toBeDisabled();

    // Type the project name
    const confirmInput = page.getByTestId('delete-confirm-input');
    await confirmInput.fill(testProjects[0]);

    // Confirm button should now be enabled
    await expect(confirmButton).toBeEnabled();
  });

  test('delete modal closes on cancel', async ({ page }) => {
    await page.goto('/');

    const selectorButton = page.getByTestId('project-selector-button');
    await selectorButton.click();

    const deleteButton = page.getByTestId(`delete-project-${testProjects[0]}`);
    await deleteButton.click();

    const deleteModal = page.getByTestId('delete-project-modal');
    await expect(deleteModal).toBeVisible();

    const cancelButton = page.getByTestId('delete-cancel-button');
    await cancelButton.click();

    await expect(deleteModal).not.toBeVisible();
  });

  test('delete modal closes on backdrop click', async ({ page }) => {
    await page.goto('/');

    const selectorButton = page.getByTestId('project-selector-button');
    await selectorButton.click();

    const deleteButton = page.getByTestId(`delete-project-${testProjects[0]}`);
    await deleteButton.click();

    const deleteModal = page.getByTestId('delete-project-modal');
    await expect(deleteModal).toBeVisible();

    const backdrop = page.getByTestId('delete-modal-backdrop');
    await backdrop.click({ position: { x: 0, y: 0 } });

    await expect(deleteModal).not.toBeVisible();
  });

  test('highlights currently selected project', async ({ page }) => {
    await page.goto('/');

    const selectorButton = page.getByTestId('project-selector-button');

    // First select a project explicitly
    await selectorButton.click();
    const firstProjectOption = page.getByTestId(`project-option-${testProjects[0]}`);
    await firstProjectOption.click();

    // Now reopen the dropdown and verify the selected project is highlighted
    await selectorButton.click();
    const dropdown = page.getByTestId('project-dropdown');
    await expect(dropdown).toBeVisible();

    const highlightedOption = page.getByTestId(`project-option-${testProjects[0]}`);
    // The selected project should have bg-blue-50 class
    await expect(highlightedOption).toHaveClass(/bg-blue-50/);
  });
});
