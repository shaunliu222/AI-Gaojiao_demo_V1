import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, message, Tabs } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/services/request';

const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useAuthStore();

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      const res: any = await authApi.login(values);
      if (res.code === 200) {
        setUser(res.data);
        message.success(`Welcome, ${res.data.name}`);
        navigate('/dashboard');
      } else {
        message.error(res.message || 'Login failed');
      }
    } catch {
      message.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (username: string, password: string) => {
    onFinish({ username, password });
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    }}>
      <Card style={{ width: 420, borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1a1a2e', marginBottom: 4 }}>
            Z 智谱
          </h1>
          <p style={{ color: '#999', fontSize: 14 }}>Higher Education AI Platform</p>
        </div>

        <Form name="login" onFinish={onFinish} size="large">
          <Form.Item name="username" rules={[{ required: true, message: 'Please enter username' }]}>
            <Input prefix={<UserOutlined />} placeholder="Username" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: 'Please enter password' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Password" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block
              style={{ height: 44, borderRadius: 8, background: 'linear-gradient(135deg, #1a1a2e, #16213e)' }}>
              Login
            </Button>
          </Form.Item>
        </Form>

        <div style={{ marginTop: 16 }}>
          <p style={{ color: '#999', fontSize: 12, marginBottom: 8, textAlign: 'center' }}>Quick Login (Demo)</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button block size="small" onClick={() => quickLogin('admin', 'admin123')}>Admin</Button>
            <Button block size="small" onClick={() => quickLogin('teacher', 'teacher123')}>Teacher</Button>
            <Button block size="small" onClick={() => quickLogin('student', 'student123')}>Student</Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default LoginPage;
