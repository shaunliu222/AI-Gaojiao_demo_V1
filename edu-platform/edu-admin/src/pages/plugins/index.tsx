import React, { useState } from 'react';
import { Table, Tag, Input, Button, Space, Tabs, Modal, Form, Select, message, Collapse, Typography, Badge } from 'antd';
import { PlusOutlined, SearchOutlined, ReloadOutlined, DeleteOutlined, ApiOutlined, LinkOutlined } from '@ant-design/icons';
import { mockMcpServers } from '@/mocks/data';

const { Text } = Typography;

const mockTools = [
  { name: 'query_schedule', description: '查询课表', params: 'student_id: string' },
  { name: 'query_grade', description: '查询成绩', params: 'student_id: string, semester: string' },
  { name: 'query_course', description: '查询课程信息', params: 'course_id: string' },
];

const PluginsPage: React.FC = () => {
  const [plugins, setPlugins] = useState(mockMcpServers);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');
  const [addOpen, setAddOpen] = useState(false);
  const [addType, setAddType] = useState<'mcp' | 'api'>('mcp');
  const [form] = Form.useForm();
  const [testResult, setTestResult] = useState<string>('');

  const filtered = plugins.filter(p => {
    const matchSearch = !search || p.name.includes(search);
    const matchTab = tab === 'all' || (tab === 'mcp' ? p.transportType !== 'rest' : p.transportType === 'rest');
    return matchSearch && matchTab;
  });

  const handleTestConnection = () => {
    setTestResult('testing');
    setTimeout(() => {
      setTestResult('success');
      message.success('连接成功，检测到 3 个可用工具');
    }, 1500);
  };

  const handleAdd = () => {
    form.validateFields().then(values => {
      setPlugins([{ id: Date.now(), ...values, status: 'active', isPublic: values.isPublic ?? true }, ...plugins]);
      setAddOpen(false);
      form.resetFields();
      setTestResult('');
      message.success('插件接入成功');
    });
  };

  const columns = [
    { title: '名称', dataIndex: 'name', render: (t: string) => <Text strong>{t}</Text> },
    { title: '类型', dataIndex: 'transportType', render: (t: string) => <Tag color={t === 'rest' ? 'orange' : 'blue'}>{t === 'rest' ? 'REST API' : `MCP/${t.toUpperCase()}`}</Tag>, width: 120 },
    { title: '端点 URL', dataIndex: 'endpointUrl', render: (t: string) => <Text copyable style={{ fontSize: 12 }}>{t}</Text>, ellipsis: true },
    { title: '状态', dataIndex: 'status', render: (t: string) => <Badge status={t === 'active' ? 'success' : 'error'} text={t === 'active' ? '在线' : '离线'} />, width: 90 },
    { title: '权限', dataIndex: 'isPublic', render: (v: boolean) => <Tag color={v ? 'blue' : 'red'}>{v ? '公共' : '私有'}</Tag>, width: 80 },
    { title: '操作', width: 180, render: (_: any, record: any) => (
      <Space>
        <Button type="link" size="small" icon={<ReloadOutlined />} onClick={() => message.info('刷新状态...')}>刷新</Button>
        <Button type="link" size="small" icon={<LinkOutlined />}>配置</Button>
        <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => setPlugins(plugins.filter(p => p.id !== record.id))}>删除</Button>
      </Space>
    )},
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>插件中心</h2>
        <Space>
          <Input placeholder="搜索插件..." prefix={<SearchOutlined />} value={search} onChange={e => setSearch(e.target.value)} style={{ width: 240, borderRadius: 8 }} allowClear />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setAddType('mcp'); setAddOpen(true); }} style={{ background: '#1a1a2e', borderRadius: 8 }}>接入插件</Button>
        </Space>
      </div>

      <Tabs activeKey={tab} onChange={setTab} items={[
        { key: 'all', label: '全部' }, { key: 'mcp', label: 'MCP Server' }, { key: 'api', label: '外部 API' },
      ]} style={{ marginBottom: 8 }} />

      <Table dataSource={filtered} columns={columns} rowKey="id" size="small"
        expandable={{
          expandedRowRender: () => (
            <div style={{ padding: '8px 0' }}>
              <Text strong style={{ fontSize: 13, marginBottom: 8, display: 'block' }}>暴露的工具列表</Text>
              <Table dataSource={mockTools} rowKey="name" size="small" pagination={false} columns={[
                { title: 'Tool 名称', dataIndex: 'name', render: (t: string) => <Tag color="geekblue">{t}</Tag> },
                { title: '描述', dataIndex: 'description' },
                { title: '参数', dataIndex: 'params', render: (t: string) => <Text code style={{ fontSize: 12 }}>{t}</Text> },
              ]} />
            </div>
          ),
        }}
      />

      <Modal title={`接入${addType === 'mcp' ? ' MCP Server' : '外部 API'}`} open={addOpen} onCancel={() => { setAddOpen(false); setTestResult(''); }}
        onOk={handleAdd} width={560} okText="确认接入" okButtonProps={{ style: { background: '#1a1a2e' }, disabled: testResult !== 'success' }}>
        <div style={{ marginBottom: 16 }}>
          <Tabs activeKey={addType} onChange={v => setAddType(v as 'mcp' | 'api')} items={[
            { key: 'mcp', label: 'MCP Server' }, { key: 'api', label: '外部 API' },
          ]} size="small" />
        </div>
        <Form form={form} layout="vertical" initialValues={{ transportType: 'sse', authType: 'none', isPublic: true }}>
          <Form.Item name="name" label="名称" rules={[{ required: true }]}><Input placeholder="教务系统 MCP" /></Form.Item>
          <Form.Item name="endpointUrl" label="端点 URL" rules={[{ required: true }]}><Input placeholder={addType === 'mcp' ? 'http://jw.edu.cn/mcp' : 'https://api.example.com/v1'} /></Form.Item>
          {addType === 'mcp' && (
            <Form.Item name="transportType" label="传输方式">
              <Select options={[{ label: 'SSE (Server-Sent Events)', value: 'sse' }, { label: 'HTTP (Streamable HTTP)', value: 'http' }, { label: 'stdio (标准输入输出)', value: 'stdio' }]} />
            </Form.Item>
          )}
          {addType === 'api' && (<>
            <Form.Item name="httpMethod" label="请求方式">
              <Select options={[{ label: 'GET', value: 'GET' }, { label: 'POST', value: 'POST' }]} />
            </Form.Item>
            <Form.Item name="headers" label="请求头（JSON）">
              <Input.TextArea rows={2} placeholder='{"Authorization": "Bearer xxx"}' style={{ fontFamily: 'monospace' }} />
            </Form.Item>
          </>)}
          <Form.Item name="authType" label="认证方式">
            <Select options={[{ label: '无认证', value: 'none' }, { label: 'Token', value: 'token' }, { label: 'Basic Auth', value: 'basic' }]} />
          </Form.Item>
          <Form.Item name="isPublic" label="权限">
            <Select options={[{ label: '公共', value: true }, { label: '私有', value: false }]} />
          </Form.Item>
          <Button onClick={handleTestConnection} loading={testResult === 'testing'} icon={<LinkOutlined />}
            style={{ marginBottom: 16 }} type={testResult === 'success' ? 'default' : 'primary'}>
            {testResult === 'success' ? '✅ 连接成功' : testResult === 'testing' ? '测试中...' : '🔗 测试连接'}
          </Button>
        </Form>
      </Modal>
    </div>
  );
};

export default PluginsPage;
