import React, { useState } from 'react';
import { Table, Tag, Input, Button, Space, Tabs, Modal, Form, Select, Switch, message } from 'antd';
import { PlusOutlined, SearchOutlined, UploadOutlined, DeleteOutlined } from '@ant-design/icons';
import { mockKeywords, mockAuditLogs } from '@/mocks/data';

const SecurityPage: React.FC = () => {
  const [tab, setTab] = useState('keywords');
  const [keywords, setKeywords] = useState(mockKeywords);
  const [addOpen, setAddOpen] = useState(false);
  const [form] = Form.useForm();

  const keywordColumns = [
    { title: '关键词', dataIndex: 'word' },
    { title: '分类', dataIndex: 'category', render: (t: string) => <Tag>{t}</Tag> },
    { title: '处理方式', dataIndex: 'severity', render: (t: string) => <Tag color={t === 'block' ? 'red' : 'orange'}>{t === 'block' ? '拦截' : '警告'}</Tag> },
    { title: '状态', dataIndex: 'status', render: (v: number, r: any) => <Switch size="small" checked={!!v} onChange={checked => setKeywords(keywords.map(k => k.id === r.id ? { ...k, status: checked ? 1 : 0 } : k))} /> },
    { title: '操作', render: (_: any, r: any) => <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => setKeywords(keywords.filter(k => k.id !== r.id))}>删除</Button> },
  ];

  const auditColumns = [
    { title: '用户', dataIndex: 'username' },
    { title: '输入内容', dataIndex: 'input', ellipsis: true },
    { title: '命中规则', dataIndex: 'hitRule', render: (t: string) => <Tag color="red">{t}</Tag> },
    { title: '处理结果', dataIndex: 'action', render: (t: string) => <Tag color={t === 'blocked' ? 'red' : 'orange'}>{t === 'blocked' ? '已拦截' : '已警告'}</Tag> },
    { title: '时间', dataIndex: 'createdAt' },
  ];

  return (
    <div>
      <h2 style={{ marginBottom: 20, fontSize: 20, fontWeight: 600 }}>安全策略</h2>

      <Tabs activeKey={tab} onChange={setTab} items={[
        { key: 'keywords', label: '关键词管理' },
        { key: 'policies', label: '安全策略' },
        { key: 'model_policy', label: '模型安全策略' },
        { key: 'audit', label: '审计日志' },
      ]} />

      {tab === 'keywords' && (<>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 16 }}>
          <Button icon={<UploadOutlined />}>批量导入 CSV</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddOpen(true)} style={{ background: '#1a1a2e' }}>添加关键词</Button>
        </div>
        <Table dataSource={keywords} columns={keywordColumns} rowKey="id" size="small" />
      </>)}

      {tab === 'policies' && (
        <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>
          <p>安全策略配置：按学院/角色分配不同内容审核规则</p>
          <Button type="primary" icon={<PlusOutlined />} style={{ background: '#1a1a2e' }}>创建策略</Button>
        </div>
      )}

      {tab === 'model_policy' && (
        <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>
          <p>模型安全策略：配置不同角色可使用的模型范围</p>
          <Table dataSource={[
            { role: '管理员', models: 'GLM-4-Plus, Qwen-Max, DeepSeek-V3, GLM-4V, CogView-3' },
            { role: '教师', models: 'GLM-4-Plus, Qwen-Max, DeepSeek-V3' },
            { role: '学生', models: 'GLM-4-Plus, Qwen-Max' },
          ]} columns={[
            { title: '角色', dataIndex: 'role' },
            { title: '可用模型', dataIndex: 'models' },
            { title: '操作', render: () => <Button type="link" size="small">编辑</Button> },
          ]} rowKey="role" size="small" pagination={false} />
        </div>
      )}

      {tab === 'audit' && (
        <Table dataSource={mockAuditLogs} columns={auditColumns} rowKey="id" size="small" />
      )}

      <Modal title="添加关键词" open={addOpen} onCancel={() => setAddOpen(false)} onOk={() => {
        form.validateFields().then(v => { setKeywords([{ id: Date.now(), ...v, status: 1 }, ...keywords]); setAddOpen(false); form.resetFields(); message.success('添加成功'); });
      }}>
        <Form form={form} layout="vertical">
          <Form.Item name="word" label="关键词" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="category" label="分类"><Select options={[{ label: '政治', value: 'politics' }, { label: '暴力', value: 'violence' }, { label: '学术不端', value: 'academic' }, { label: '自定义', value: 'custom' }]} /></Form.Item>
          <Form.Item name="severity" label="处理方式"><Select options={[{ label: '拦截', value: 'block' }, { label: '警告', value: 'warn' }]} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SecurityPage;
