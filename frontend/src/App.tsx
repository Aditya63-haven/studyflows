import { Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { Layout } from './components/Layout';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { AssistantPage } from './pages/AssistantPage';
import { AvailabilityPage } from './pages/AvailabilityPage';
import { BookmarksPage } from './pages/BookmarksPage';
import { DashboardPage } from './pages/DashboardPage';
import { DeckEditorPage } from './pages/DeckEditorPage';
import { ExamPlanDetailPage } from './pages/ExamPlanDetailPage';
import { ExamPlansPage } from './pages/ExamPlansPage';
import { FlashcardDeckPage } from './pages/FlashcardDeckPage';
import { HistoryPage } from './pages/HistoryPage';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { NoteEditorPage } from './pages/NoteEditorPage';
import { NoteViewPage } from './pages/NoteViewPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ProfilePage } from './pages/ProfilePage';
import { PublicNotePage } from './pages/PublicNotePage';
import { PublicQuizPage } from './pages/PublicQuizPage';
import { QuizEditorPage } from './pages/QuizEditorPage';
import { QuizResultPage } from './pages/QuizResultPage';
import { RegisterPage } from './pages/RegisterPage';
import { RevisionPage } from './pages/RevisionPage';
import { SearchPage } from './pages/SearchPage';
import { SettingsPage } from './pages/SettingsPage';
import { SpaceDetailPage } from './pages/SpaceDetailPage';
import { SpacesPage } from './pages/SpacesPage';
import { TakeQuizPage } from './pages/TakeQuizPage';
import { TasksPage } from './pages/TasksPage';

export const App = () => (
  <Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route path="/share/note/:token" element={<PublicNotePage />} />
    <Route path="/share/quiz/:token" element={<PublicQuizPage />} />

    <Route element={<ProtectedRoute />}>
      <Route element={<Layout />}>
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="assistant" element={<AssistantPage />} />
        <Route path="spaces" element={<SpacesPage />} />
        <Route path="spaces/:spaceId" element={<SpaceDetailPage />} />
        <Route path="spaces/:spaceId/notes/new" element={<NoteEditorPage />} />
        <Route path="notes/:noteId" element={<NoteViewPage />} />
        <Route path="notes/:noteId/edit" element={<NoteEditorPage />} />
        <Route path="spaces/:spaceId/quizzes/new" element={<QuizEditorPage />} />
        <Route path="quizzes/:quizId/edit" element={<QuizEditorPage />} />
        <Route path="quizzes/:quizId/take" element={<TakeQuizPage />} />
        <Route path="quizzes/:quizId/result/:attemptId" element={<QuizResultPage />} />
        <Route path="spaces/:spaceId/decks/new" element={<DeckEditorPage />} />
        <Route path="decks/:deckId" element={<FlashcardDeckPage />} />
        <Route path="decks/:deckId/edit" element={<DeckEditorPage />} />
        <Route path="revision" element={<RevisionPage />} />
        <Route path="availability" element={<AvailabilityPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="exam-plans" element={<ExamPlansPage />} />
        <Route path="exam-plans/:planId" element={<ExamPlanDetailPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="bookmarks" element={<BookmarksPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Route>
  </Routes>
);
