import React, { useState, useEffect, useCallback } from 'react';
import { Table, Tag, Input, Button, Space, Tabs, Modal, Form, Select, Switch, message, Popconfirm } from 'antd';
import { PlusOutlined, SearchOutlined, UploadOutlined, DeleteOutlined } from '@ant-design/icons';
import { securityApi } from '@/services/request';

const SecurityPage: React.FC = () => {
  const [tab, setTab] = useState('keywords');
  const [keywords, setKeywords] = useState<any[]>([]);
  const [kwTotal, setKwTotal] = useState(0);
  const [kwPage, setKwPage] = useState(1);
  const [kwLoading, setKwLoading] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [auditLoading, setAuditLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [form] = Form.useForm();

  const fetchKeywords = useCallback(async () => {
    setKwLoading(true);
    try {
      const res: any = await securityApi.listKeywords({ page: kwPage, size: 20 });
      setKeywords(res.data?.list || []);
      setKwTotal(res.data?.total || 0);
    } catch { message.error('加载关键词失败'); }
    setKwLoading(false);
  }, [kwPage]);

  const fetchAuditLogs = useCallback(async () => {
    setAuditLoading(true);
    try {
      const res: any = await securityApi.auditLogs({ page: auditPage, size: 20 });
      setAuditLogs(res.data?.list || []);
      setAuditTotal(res.data?.total || 0);
    } catch { message.error('加载审计日志失败'); }
    setAuditLoading(false);
  }, [auditPage]);

  useEffect(() => { if (tab === 'keywords') fetchKeywords(); }, [tab, fetchKeywords]);
  useEffect(() => { if (tab === 'audit') fetchAuditLogs(); }, [tab, fetchAuditLogs]);

  const handleAddKeyword = async () => {
    try {
      const values = await form.validateFields();
      await securityApi.createKeyword(values);
      message.success('添加成功');
      setAddOpen(false);
      form.resetFields();
      fetchKeywords();
    } catch (err: any) { message.error(err.response?.data?.message || '添加失败'); }
  };

  const handleDeleteKeyword = async (id: number) => {
    try {
      await securityApi.deleteKeyword(id);
      message.success('删除成功');
      fetchKeywords();
    } catch { message.error('删除失败'); }
  };

  const handleToggleStatus = async (id: number, checked: boolean) => {
    try {
      await securityApi.toggleKeywordStatus(id, checked ? 1 : 0);
      fetchKeywords();
    } catch { message.error('状态切换失败'); }
  };

  const keywordColumns = [
    { title: '关键词', dataIndex: 'word' },
    { title: '分类', dataIndex: 'category', render: (t: string) => t ? <Tag>{t}</Tag> : '-' },
    { title: '处理方式', dataIndex: 'severity', render: (t: string) => <Tag color={t === 'block' ? 'red' : 'orange'}>{t === 'block' ? '拦截' : '警告'}</Tag> },
    { title: '状态', dataIndex: 'status', render: (v: number, r: any) => <Switch size="small" checked={v === 1} onChange={checked => handleToggleStatus(r.id, checked)} /> },
    { title: '操作', render: (_: any, r: any) => (
      <Popconfirm title="确认删除?" onConfirm={() => handleDeleteKeyword(r.id)}>
        <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
      </Popconfirm>
    ) },
  ];

  const auditColumns = [
    { title: '用户ID', dataIndex: 'userId' },
    { title: '输入内容', dataIndex: 'inputText', ellipsis: true },
    { title: '命中规则', dataIndex: 'hitRule', render: (t: string) => t ? <Tag color="red">{t}</Tag> : '-' },
    { title: '处理结果', dataIndex: 'actionTaken', render: (t: string) => <Tag color={t === 'block' ? 'red' : 'orange'}>{t === 'block' ? '已拦截' : t}</Tag> },
    { title: '时间', dataIndex: 'createdAt', render: (t: string) => t?.slice(0, 19).replace('T', ' ') },
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
        <Table dataSource={keywords} columns={keywordColumns} rowKey="id" size="small" loading={kwLoading}
          pagination={{ current: kwPage, total: kwTotal, pageSize: 20, onChange: setKwPage }} />
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
        </div>
      )}

      {tab === 'audit' && (
        <Table dataSource={auditLogs} columns={auditColumns} rowKey="id" size="small" loading={auditLoading}
          pagination={{ current: auditPage, total: auditTotal, pageSize: 20, onChange: setAuditPage }} />
      )}

      <Modal title="添加关键词" open={addOpen} onCancel={() => setAddOpen(false)} onOk={handleAddKeyword}>
        <Form form={form} layout="vertical">
          <Form.Item name="word" label="关键词" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="category" label="分类"><Select options={[{ label: '政治', value: 'politics' }, { label: '暴力', value: 'violence' }, { label: '学术不端', value: 'academic' }, { label: '自定义', value: 'custom' }]} /></Form.Item>
          <Form.Item name="severity" label="处理方式" initialValue="block"><Select options={[{ label: '拦截', value: 'block' }, { label: '警告', value: 'warn' }]} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SecurityPage;
