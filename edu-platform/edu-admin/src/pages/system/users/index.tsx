import React, { useState } from 'react';
import { Table, Tag, Input, Button, Space, Drawer, Form, Select, Tree, Tabs, Modal, message } from 'antd';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import { mockUsers } from '@/mocks/data';

const UsersPage: React.FC = () => {
  const [users] = useState(mockUsers);
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('users');
  const [form] = Form.useForm();

  const userColumns = [
    { title: '用户名', dataIndex: 'username' },
    { title: '姓名', dataIndex: 'name' },
    { title: '邮箱', dataIndex: 'email' },
    { title: '角色', dataIndex: 'role', render: (t: string) => <Tag color={t === 'admin' ? 'purple' : t === 'teacher' ? 'blue' : 'green'}>{t}</Tag> },
    { title: '学院', dataIndex: 'org' },
    { title: '状态', dataIndex: 'status', render: (v: number) => <Tag color={v ? 'green' : 'red'}>{v ? '正常' : '禁用'}</Tag> },
    { title: '操作', render: () => <Space><Button type="link" size="small" icon={<EditOutlined />}>编辑</Button><Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button></Space> },
  ];

  const roles = [
    { code: 'admin', name: '系统管理员', userCount: 1 },
    { code: 'info_center', name: '信息中心', userCount: 2 },
    { code: 'teacher', name: '教师', userCount: 15 },
    { code: 'student', name: '学生', userCount: 238 },
  ];

  const orgTree = [
    { title: 'University', key: '1', children: [
      { title: '计算机学院', key: '2' },
      { title: '信息工程学院', key: '3' },
      { title: '数学学院', key: '4' },
    ] },
  ];

  const filtered = users.filter(u => !search || u.name.includes(search) || u.username.includes(search));

  return (
    <div>
      <h2 style={{ marginBottom: 20, fontSize: 20, fontWeight: 600 }}>用户管理</h2>

      <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
        { key: 'users', label: '用户列表' },
        { key: 'roles', label: '角色管理' },
        { key: 'orgs', label: '组织架构' },
      ]} />

      {activeTab === 'users' && (<>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 16 }}>
          <Input placeholder="搜索用户..." prefix={<SearchOutlined />} value={search} onChange={e => setSearch(e.target.value)} style={{ width: 240 }} allowClear />
          <Button icon={<UploadOutlined />}>批量导入</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setDrawerOpen(true)} style={{ background: '#1a1a2e' }}>添加用户</Button>
        </div>
        <Table dataSource={filtered} columns={userColumns} rowKey="id" size="small" />
      </>)}

      {activeTab === 'roles' && (
        <Table dataSource={roles} rowKey="code" size="small" columns={[
          { title: '角色编码', dataIndex: 'code' },
          { title: '角色名称', dataIndex: 'name' },
          { title: '用户数', dataIndex: 'userCount' },
          { title: '操作', render: () => <Button type="link" size="small">配置权限</Button> },
        ]} />
      )}

      {activeTab === 'orgs' && (
        <div style={{ padding: 16 }}>
          <Button type="primary" icon={<PlusOutlined />} style={{ marginBottom: 16, background: '#1a1a2e' }}>添加部门</Button>
          <Tree treeData={orgTree} defaultExpandAll showLine />
        </div>
      )}

      <Drawer title="添加用户" open={drawerOpen} onClose={() => setDrawerOpen(false)} width={400} extra={<Button type="primary" onClick={() => { message.success('添加成功（Mock）'); setDrawerOpen(false); }} style={{ background: '#1a1a2e' }}>保存</Button>}>
        <Form form={form} layout="vertical">
          <Form.Item name="username" label="用户名" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="name" label="姓名" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="email" label="邮箱"><Input /></Form.Item>
          <Form.Item name="role" label="角色"><Select options={roles.map(r => ({ label: r.name, value: r.code }))} /></Form.Item>
          <Form.Item name="org" label="所属学院"><Select options={[{ label: '计算机学院', value: 'CS' }, { label: '信息工程学院', value: 'IE' }, { label: '数学学院', value: 'MATH' }]} /></Form.Item>
        </Form>
      </Drawer>
    </div>
  );
};

export default UsersPage;
