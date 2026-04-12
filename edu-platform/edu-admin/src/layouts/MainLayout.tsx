import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, Badge, theme } from 'antd';
import {
  MessageOutlined, AppstoreOutlined, UserOutlined, ThunderboltOutlined,
  ApiOutlined, GlobalOutlined, FileTextOutlined, OrderedListOutlined,
  BarChartOutlined, ExperimentOutlined, RobotOutlined, ApartmentOutlined,
  BookOutlined, CalendarOutlined, AimOutlined, DatabaseOutlined,
  FolderOutlined, TeamOutlined, LockOutlined, SafetyOutlined,
  NodeIndexOutlined, SettingOutlined, BellOutlined, SaveOutlined,
  DashboardOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/stores/authStore';
import type { MenuProps } from 'antd';

const { Sider, Content } = Layout;

const menuItems: (role: string) => MenuProps['items'] = (role) => {
  const isAdmin = role === 'admin' || role === 'info_center';
  const isTeacher = isAdmin || role === 'teacher';

  return [
    { key: '/dashboard', icon: <DashboardOutlined />, label: '总览' },
    { type: 'divider' as const },
    { type: 'group' as const, label: 'Autoclaw', children: [
      { key: '/chat', icon: <MessageOutlined />, label: '对话' },
    ]},
    { type: 'group' as const, label: 'Agent', children: [
      { key: '/agents/explore', icon: <AppstoreOutlined />, label: '智能体广场' },
      { key: '/agents/mine', icon: <UserOutlined />, label: '我的智能体' },
      { key: '/skills', icon: <ThunderboltOutlined />, label: 'Skill Hub' },
      ...(isAdmin ? [
        { key: '/plugins', icon: <ApiOutlined />, label: '插件中心' },
        { key: '/models', icon: <GlobalOutlined />, label: '模型管理' },
      ] : []),
    ]},
    { type: 'group' as const, label: '智慧助学助教', children: [
      ...(isTeacher ? [{ key: '/teaching/plan', icon: <FileTextOutlined />, label: '教学计划' }] : []),
      { key: '/teaching/tasks', icon: <OrderedListOutlined />, label: '任务中心' },
      ...(isTeacher ? [{ key: '/teaching/analysis', icon: <BarChartOutlined />, label: '学情分析' }] : []),
      { key: '/teaching/lab', icon: <ExperimentOutlined />, label: 'AI实训室' },
      { key: '/teaching/companion', icon: <RobotOutlined />, label: 'AI学伴' },
    ]},
    { type: 'group' as const, label: '资源中心', children: [
      { key: '/knowledge/graph', icon: <ApartmentOutlined />, label: '知识图谱' },
      ...(isTeacher ? [{ key: '/courses', icon: <BookOutlined />, label: '课程管理' }] : []),
      ...(isTeacher ? [{ key: '/schedule', icon: <CalendarOutlined />, label: '课表管理' }] : []),
      ...(isTeacher ? [{ key: '/competency/skills', icon: <AimOutlined />, label: '技能管理' }] : []),
      { key: '/knowledge/base', icon: <DatabaseOutlined />, label: '知识库' },
      { key: '/resources', icon: <FolderOutlined />, label: '教学资源管理' },
    ]},
    ...(isAdmin ? [{ type: 'group' as const, label: '系统管理', children: [
      { key: '/system/users', icon: <TeamOutlined />, label: '用户管理' },
      { key: '/system/security', icon: <SafetyOutlined />, label: '安全策略' },
      { key: '/system/channels', icon: <NodeIndexOutlined />, label: '渠道管理' },
      { key: '/system/settings', icon: <SettingOutlined />, label: '系统设置' },
    ]}] : []),
  ];
};

const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { token: { colorBgContainer } } = theme.useToken();

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    navigate(key);
  };

  const userMenuItems: MenuProps['items'] = [
    { key: 'logout', label: '退出登录', danger: true },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        width={220}
        collapsed={collapsed}
        onCollapse={setCollapsed}
        style={{
          background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
        }}
        theme="dark"
      >
        <div style={{ padding: '16px 20px', color: '#fff', fontSize: 18, fontWeight: 700 }}>
          {collapsed ? 'Z' : 'Z 智谱'}
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems(user?.role || 'student')}
          onClick={handleMenuClick}
          style={{ background: 'transparent', borderRight: 0 }}
        />

        <div style={{
          position: 'absolute', bottom: 0, width: '100%',
          padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Dropdown menu={{ items: userMenuItems, onClick: ({ key }) => { if (key === 'logout') { logout(); navigate('/login'); } } }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: '#fff' }}>
              <Avatar size={32} src={user?.avatar} />
              {!collapsed && <span style={{ fontSize: 13 }}>{user?.name}</span>}
            </div>
          </Dropdown>
          {!collapsed && (
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <SaveOutlined style={{ color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }} />
              <Badge count={3} size="small">
                <BellOutlined style={{ color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }} />
              </Badge>
            </div>
          )}
        </div>
      </Sider>

      <Layout style={{ marginLeft: collapsed ? 80 : 220, transition: 'margin-left 0.2s' }}>
        <Content style={{ margin: 24, padding: 24, background: colorBgContainer, borderRadius: 12, minHeight: 280 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
