import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, Spin, App as AntApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import MainLayout from '@/layouts/MainLayout';
import LoginPage from '@/pages/login';
import PlaceholderPage from '@/components/PlaceholderPage';
import { useAuthStore } from '@/stores/authStore';

// Lazy load pages
const DashboardPage = lazy(() => import('@/pages/dashboard'));
const ChatPage = lazy(() => import('@/pages/chat'));
const AgentExplorePage = lazy(() => import('@/pages/agents/explore'));
const AgentMinePage = lazy(() => import('@/pages/agents/mine'));
const ModelsPage = lazy(() => import('@/pages/models'));
const ResourcesPage = lazy(() => import('@/pages/resources'));
const KnowledgeGraphPage = lazy(() => import('@/pages/knowledge/graph'));
const UsersPage = lazy(() => import('@/pages/system/users'));
const SecurityPage = lazy(() => import('@/pages/system/security'));
const SkillsPage = lazy(() => import('@/pages/skills'));
const PluginsPage = lazy(() => import('@/pages/plugins'));
const ChannelsPage = lazy(() => import('@/pages/system/channels'));

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoggedIn } = useAuthStore();
  if (!isLoggedIn()) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const Loading = () => <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}><Spin size="large" /></div>;

const App: React.FC = () => {
  return (
    <ConfigProvider locale={zhCN} theme={{
      token: {
        colorPrimary: '#1a1a2e',
        borderRadius: 8,
        fontSize: 14,
      },
    }}>
      <AntApp>
      <BrowserRouter>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="chat" element={<ChatPage />} />
              <Route path="agents/explore" element={<AgentExplorePage />} />
              <Route path="agents/mine" element={<AgentMinePage />} />
              <Route path="skills" element={<SkillsPage />} />
              <Route path="plugins" element={<PluginsPage />} />
              <Route path="models" element={<ModelsPage />} />
              <Route path="teaching/plan" element={<PlaceholderPage title="教学计划" />} />
              <Route path="teaching/tasks" element={<PlaceholderPage title="任务中心" />} />
              <Route path="teaching/analysis" element={<PlaceholderPage title="学情分析" />} />
              <Route path="teaching/lab" element={<PlaceholderPage title="AI实训室" />} />
              <Route path="teaching/companion" element={<PlaceholderPage title="AI学伴" />} />
              <Route path="knowledge/graph" element={<KnowledgeGraphPage />} />
              <Route path="knowledge/base" element={<PlaceholderPage title="知识库" />} />
              <Route path="knowledge/points" element={<PlaceholderPage title="知识点管理" />} />
              <Route path="competency/graph" element={<PlaceholderPage title="能力图谱" />} />
              <Route path="competency/skills" element={<PlaceholderPage title="技能管理" />} />
              <Route path="competency/path" element={<PlaceholderPage title="学习路径" />} />
              <Route path="courses" element={<PlaceholderPage title="课程管理" />} />
              <Route path="schedule" element={<PlaceholderPage title="课表管理" />} />
              <Route path="resources" element={<ResourcesPage />} />
              <Route path="system/users" element={<UsersPage />} />
              <Route path="system/security" element={<SecurityPage />} />
              <Route path="system/channels" element={<ChannelsPage />} />
              <Route path="system/settings" element={<PlaceholderPage title="系统设置" />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  );
};

export default App;
