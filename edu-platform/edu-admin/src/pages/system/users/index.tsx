import React, { useState, useEffect, useCallback } from 'react';
import { Table, Tag, Input, Button, Space, Drawer, Form, Select, Tree, Tabs, message, Popconfirm } from 'antd';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import { userApi, roleApi, orgApi } from '@/services/request';

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('users');
  const [roles, setRoles] = useState<any[]>([]);
  const [orgTree, setOrgTree] = useState<any[]>([]);
  const [form] = Form.useForm();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await userApi.list({ page, size: 20, keyword: search || undefined });
      setUsers(res.data?.list || []);
      setTotal(res.data?.total || 0);
    } catch { message.error('Failed to load users'); }
    setLoading(false);
  }, [page, search]);

  const fetchRoles = async () => {
    try {
      const res: any = await roleApi.list();
      setRoles(res.data || []);
    } catch { message.error('Failed to load roles'); }
  };

  const fetchOrgs = async () => {
    try {
      const res: any = await orgApi.tree();
      setOrgTree(formatOrgTree(res.data || []));
    } catch { message.error('Failed to load orgs'); }
  };

  const formatOrgTree = (nodes: any[]): any[] =>
    nodes.map(n => ({ title: n.name, key: String(n.id), children: formatOrgTree(n.children || []) }));

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => { if (activeTab === 'roles') fetchRoles(); }, [activeTab]);
  useEffect(() => { if (activeTab === 'orgs') fetchOrgs(); }, [activeTab]);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      if (editingUser) {
        await userApi.update(editingUser.id, values);
        message.success('更新成功');
      } else {
        await userApi.create({ ...values, password: values.password || 'password123' });
        message.success('添加成功');
      }
      setDrawerOpen(false);
      form.resetFields();
      setEditingUser(null);
      fetchUsers();
    } catch (err: any) {
      message.error(err.response?.data?.message || '操作失败');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await userApi.delete(id);
      message.success('删除成功');
      fetchUsers();
    } catch { message.error('删除失败'); }
  };

  const openEdit = (record: any) => {
    setEditingUser(record);
    form.setFieldsValue(record);
    setDrawerOpen(true);
  };

  const userColumns = [
    { title: '用户名', dataIndex: 'username' },
    { title: '姓名', dataIndex: 'name' },
    { title: '邮箱', dataIndex: 'email' },
    { title: '状态', dataIndex: 'status', render: (v: number) => <Tag color={v === 1 ? 'green' : 'red'}>{v === 1 ? '正常' : '禁用'}</Tag> },
    { title: '创建时间', dataIndex: 'createdAt', render: (t: string) => t?.slice(0, 10) },
    { title: '操作', render: (_: any, record: any) => (
      <Space>
        <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>编辑</Button>
        <Popconfirm title="确认删除?" onConfirm={() => handleDelete(record.id)}>
          <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
        </Popconfirm>
      </Space>
    ) },
  ];

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
          <Input placeholder="搜索用户..." prefix={<SearchOutlined />} value={search} onChange={e => setSearch(e.target.value)} style={{ width: 240 }} allowClear onPressEnter={() => { setPage(1); fetchUsers(); }} />
          <Button icon={<UploadOutlined />}>批量导入</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingUser(null); form.resetFields(); setDrawerOpen(true); }} style={{ background: '#1a1a2e' }}>添加用户</Button>
        </div>
        <Table dataSource={users} columns={userColumns} rowKey="id" size="small" loading={loading}
          pagination={{ current: page, total, pageSize: 20, onChange: setPage }} />
      </>)}

      {activeTab === 'roles' && (
        <Table dataSource={roles} rowKey="id" size="small" columns={[
          { title: '角色编码', dataIndex: 'code' },
          { title: '角色名称', dataIndex: 'name' },
          { title: '描述', dataIndex: 'description' },
          { title: '状态', dataIndex: 'status', render: (v: number) => <Tag color={v === 1 ? 'green' : 'red'}>{v === 1 ? '正常' : '禁用'}</Tag> },
        ]} />
      )}

      {activeTab === 'orgs' && (
        <div style={{ padding: 16 }}>
          <Button type="primary" icon={<PlusOutlined />} style={{ marginBottom: 16, background: '#1a1a2e' }}>添加部门</Button>
          <Tree treeData={orgTree} defaultExpandAll showLine />
        </div>
      )}

      <Drawer title={editingUser ? '编辑用户' : '添加用户'} open={drawerOpen} onClose={() => setDrawerOpen(false)} width={400}
        extra={<Button type="primary" onClick={handleCreate} style={{ background: '#1a1a2e' }}>保存</Button>}>
        <Form form={form} layout="vertical">
          <Form.Item name="username" label="用户名" rules={[{ required: true }]}><Input disabled={!!editingUser} /></Form.Item>
          {!editingUser && <Form.Item name="password" label="密码" rules={[{ required: true }]}><Input.Password /></Form.Item>}
          <Form.Item name="name" label="姓名" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="email" label="邮箱"><Input /></Form.Item>
          <Form.Item name="phone" label="电话"><Input /></Form.Item>
        </Form>
      </Drawer>
    </div>
  );
};

export default UsersPage;
