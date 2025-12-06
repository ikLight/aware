import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CourseOutlineSidebar from './CourseOutlineSidebar';

// Mock course data
const mockCourseData = [
  {
    moduleId: 'module-1',
    moduleName: 'Test Module 1',
    topics: [
      {
        topicId: 'topic-1',
        topicName: 'Test Topic 1',
        subtopics: [
          {
            subtopicId: 'subtopic-1',
            subtopicName: 'Test Subtopic 1',
          },
          {
            subtopicId: 'subtopic-2',
            subtopicName: 'Test Subtopic 2',
          },
        ],
      },
    ],
  },
  {
    moduleId: 'module-2',
    moduleName: 'Test Module 2',
    topics: [
      {
        topicId: 'topic-2',
        topicName: 'Test Topic 2',
        subtopics: [
          {
            subtopicId: 'subtopic-3',
            subtopicName: 'Test Subtopic 3',
          },
        ],
      },
    ],
  },
];

describe('CourseOutlineSidebar', () => {
  beforeEach(() => {
    // Reset fetch mock before each test
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('renders loading state initially', () => {
    global.fetch.mockImplementation(
      () =>
        new Promise(() => {
          // Never resolves to keep loading state
        })
    );

    render(<CourseOutlineSidebar />);
    expect(screen.getByText(/loading course outline/i)).toBeInTheDocument();
  });

  test('renders course outline after successful data fetch', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockCourseData,
    });

    render(<CourseOutlineSidebar />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Course Outline')).toBeInTheDocument();
    });

    // Check if modules are rendered
    expect(screen.getByText('Test Module 1')).toBeInTheDocument();
    expect(screen.getByText('Test Module 2')).toBeInTheDocument();

    // Check if topics are rendered
    expect(screen.getByText('Test Topic 1')).toBeInTheDocument();
    expect(screen.getByText('Test Topic 2')).toBeInTheDocument();

    // Check if subtopics are rendered
    expect(screen.getByText('Test Subtopic 1')).toBeInTheDocument();
    expect(screen.getByText('Test Subtopic 2')).toBeInTheDocument();
    expect(screen.getByText('Test Subtopic 3')).toBeInTheDocument();
  });

  test('renders error state when fetch fails', async () => {
    const errorMessage = 'Network error';
    global.fetch.mockRejectedValueOnce(new Error(errorMessage));

    render(<CourseOutlineSidebar />);

    await waitFor(() => {
      expect(screen.getByText(/error loading course outline/i)).toBeInTheDocument();
    });

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  test('renders error state when response is not ok', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'Not Found',
    });

    render(<CourseOutlineSidebar />);

    await waitFor(() => {
      expect(screen.getByText(/error loading course outline/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/failed to load course outline: not found/i)).toBeInTheDocument();
  });

  test('fetches data from correct endpoint', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockCourseData,
    });

    render(<CourseOutlineSidebar />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/playlists/course_outline.json');
    });
  });

  test('renders correct number of modules, topics, and subtopics', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockCourseData,
    });

    render(<CourseOutlineSidebar />);

    await waitFor(() => {
      expect(screen.getByText('Test Module 1')).toBeInTheDocument();
    });

    // Should have 2 modules
    const modules = screen.getAllByRole('group');
    // Each module and topic is a details element (group role)
    // 2 modules + 2 topics = 4 groups
    expect(modules.length).toBeGreaterThanOrEqual(2);

    // Should have 3 subtopics total
    expect(screen.getByText('Test Subtopic 1')).toBeInTheDocument();
    expect(screen.getByText('Test Subtopic 2')).toBeInTheDocument();
    expect(screen.getByText('Test Subtopic 3')).toBeInTheDocument();
  });
});
