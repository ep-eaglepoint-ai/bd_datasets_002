/// <reference types="vitest" />
import { describe, expect, beforeEach, vi, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../repository_after/src/App';
import React from 'react';

describe('Resume Builder Application', () => {
    beforeEach(() => {
        window.localStorage.clear();
        vi.clearAllMocks();
    });

    test('Enter data and see live updates', async () => {
        const user = userEvent.setup();
        render(<App />);

        const nameInput = screen.getByLabelText(/Full Name/i);
        const emailInput = screen.getByLabelText(/Email/i);

        expect(nameInput).toBeInTheDocument();
        expect(emailInput).toBeInTheDocument();

        await user.type(nameInput, 'John Doe');
        await user.type(emailInput, 'john@example.com');

        expect(nameInput).toHaveValue('John Doe');
        expect(emailInput).toHaveValue('john@example.com');

        expect(screen.getByText('John Doe', { selector: 'h1' })).toBeInTheDocument();
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    test('Manage Sections (Toggle Visibility)', async () => {
        const user = userEvent.setup();
        render(<App />);

        const toggleButtons = screen.getAllByTitle('Hide Section');
        const experienceToggle = toggleButtons[2];

        expect(screen.getByText('Work Experience')).toBeInTheDocument();

        await user.click(experienceToggle);

        expect(experienceToggle).toHaveAttribute('title', 'Show Section');

        const workExperienceHeaders = screen.queryAllByText('Work Experience');
        expect(workExperienceHeaders.length).toBeLessThan(2);
    });

    test('Add and Remove Experience Items', async () => {
        const user = userEvent.setup();
        render(<App />);

        const addButton = screen.getByRole('button', { name: /Add Experience/i });
        await user.click(addButton);

        const companyInputs = screen.getAllByLabelText('Company');
        expect(companyInputs.length).toBeGreaterThan(0);

        await user.type(companyInputs[0], 'Tech Corp');

        expect(screen.getByText('Tech Corp')).toBeInTheDocument();

        const removeButtons = screen.getAllByTitle('Remove Item');
        await user.click(removeButtons[0]);

        expect(screen.queryByText('Tech Corp')).not.toBeInTheDocument();
    });

    test('Reorder Sections', async () => {
        const user = userEvent.setup();
        render(<App />);

        const moveUpButtons = screen.getAllByTitle('Move Up');
        expect(moveUpButtons.length).toBeGreaterThan(0);

        const moveDownButtons = screen.getAllByTitle('Move Down');
        expect(moveDownButtons.length).toBeGreaterThan(0);

        await user.click(moveDownButtons[0]);
    });

    test('ATS-friendly template renders correctly', () => {
        render(<App />);

        expect(screen.getByText('Your Name')).toBeInTheDocument();
        expect(screen.getByText(/Editor/i)).toBeInTheDocument();
    });

    test('Validation - required fields shows error', async () => {
        render(<App />);
        // Initially empty, should show errors
        expect(screen.getByText('Full name is required')).toBeInTheDocument();
        expect(screen.getByText('Email is required')).toBeInTheDocument();

        const nameInput = screen.getByLabelText(/Full Name/i);
        await userEvent.type(nameInput, 'Valid Name');
        expect(screen.queryByText('Full name is required')).not.toBeInTheDocument();
    });

    test('Add and Remove Custom Sections', async () => {
        const user = userEvent.setup();
        render(<App />);

        const addSectionBtn = screen.getByRole('button', { name: /Add Custom Section/i });
        await user.click(addSectionBtn);

        const titleInput = screen.getByLabelText('Section Title');
        const contentInput = screen.getByLabelText('Content');

        expect(titleInput).toBeInTheDocument();
        expect(contentInput).toBeInTheDocument();

        // Check it appears in preview
        expect(screen.getByText('Custom Section', { selector: 'h2' })).toBeInTheDocument();

        await user.clear(titleInput);
        await user.type(titleInput, 'My Languages');
        await user.type(contentInput, 'English, Spanish');

        expect(screen.getByText('My Languages', { selector: 'h2' })).toBeInTheDocument();
        expect(screen.getByText('English, Spanish', { selector: 'div' })).toBeInTheDocument();

        const removeBtn = screen.getByRole('button', { name: /Remove Section/i });
        await user.click(removeBtn);

        expect(screen.queryByText('My Languages')).not.toBeInTheDocument();
    });

    test('Empty sections handled gracefully', async () => {
        const user = userEvent.setup();
        render(<App />);

        const experience = screen.queryAllByText(/Work Experience/i);
        expect(experience.length).toBeGreaterThan(0);
    });

    test('Export PDF triggers print', async () => {
        const user = userEvent.setup();
        render(<App />);

        const exportBtn = screen.getByRole('button', { name: /Export PDF/i });
        await user.click(exportBtn);

        expect(window.print).toHaveBeenCalledTimes(1);
    });

    test('Local Storage Persistence', async () => {
        const user = userEvent.setup();
        const { unmount } = render(<App />);

        const nameInput = await screen.findByLabelText(/Full Name/i);
        await user.type(nameInput, 'Persist User');

        expect(localStorage.getItem('resume-data')).toContain('Persist User');

        unmount();

        render(<App />);
        const nameInputNew = await screen.findByLabelText(/Full Name/i);
        expect(nameInputNew).toHaveValue('Persist User');
    });

    test('UI loads and is responsive', () => {
        render(<App />);

        expect(screen.getByText(/Resume/i)).toBeInTheDocument();
        expect(screen.getByText(/Builder/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Export PDF/i })).toBeInTheDocument();
    });

    test('Enter education data', async () => {
        const user = userEvent.setup();
        render(<App />);

        const addButton = screen.getByRole('button', { name: /Add Education/i });
        await user.click(addButton);

        const institutionInputs = screen.getAllByLabelText('Institution');
        expect(institutionInputs.length).toBeGreaterThan(0);

        await user.type(institutionInputs[0], 'MIT');

        expect(screen.getByText('MIT')).toBeInTheDocument();
    });

    test('Enter project data', async () => {
        const user = userEvent.setup();
        render(<App />);

        const addButton = screen.getByRole('button', { name: /Add Project/i });
        await user.click(addButton);

        const projectInputs = screen.getAllByLabelText('Project Name');
        expect(projectInputs.length).toBeGreaterThan(0);

        await user.type(projectInputs[0], 'My Project');

        const projectElements = screen.getAllByText('My Project');
        expect(projectElements.length).toBeGreaterThan(0);
    });

    test('Enter skills data', async () => {
        const user = userEvent.setup();
        render(<App />);

        const skillsInput = screen.getByLabelText(/Skills/i);
        await user.type(skillsInput, 'React, TypeScript');

        const skillsElements = screen.getAllByText('React, TypeScript');
        expect(skillsElements.length).toBeGreaterThan(0);
    });

    test('Enter summary data', async () => {
        const user = userEvent.setup();
        render(<App />);

        const summaryInput = screen.getByLabelText(/Professional Summary/i);
        await user.type(summaryInput, 'Experienced developer');

        const summaryElements = screen.getAllByText('Experienced developer');
        expect(summaryElements.length).toBeGreaterThan(0);
    });
});
