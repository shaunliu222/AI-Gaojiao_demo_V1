import React, { useState, useEffect, useCallback } from 'react';
import { Card, Tag, Input, Button, Tabs, Space, Checkbox, Modal, Form, Select, InputNumber, Radio, Empty, message } from 'antd';
import { PlusOutlined, SearchOutlined, GlobalOutlined } from '@ant-design/icons';
import { modelApi } from '@/services/request';

const providerLogos: Record<string, string> = { zhipu: 'Z', qwen: 'Q', deepseek: 'D', openai: 'O', anthropic: 'A', minimax: 'M' };
const capabilityTabs = [
  { key: 'all', label: '🌐 全部' },
  { key: 'text', label: '文生文(含推理)' },
  { key: 'image_gen', label: '文生图' },
  { key: 'image', label: '图生文' },
  { key: 'video', label: '文生视频' },
  { key: 'other', label: '其他' },
];

const providerDefaults: Record<string, { baseUrl: string }> = {
  zhipu: { baseUrl: 'https://open.bigmodel.cn/api/paas/v4' },
  qwen: { baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
  deepseek: { baseUrl: 'https://api.deepseek.com/v1' },
  openai: { baseUrl: 'https://api.openai.com/v1' },
  anthropic: { baseUrl: 'https://api.anthropic.com/v1' },
  minimax: { baseUrl: 'https://api.minimax.chat/v1' },
  ollama: { baseUrl: 'http://localhost:11434/v1' },
  custom: { baseUrl: '' },
};

const ModelsPage: React.FC = () => {
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [form] = Form.useForm();

  const fetchModels = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await modelApi.list(tab === 'all' ? undefined : tab);
      setModels(res.data || []);
    } catch { message.error('加载模型失败'); }
    setLoading(false);
  }, [tab]);

  useEffect(() => { fetchModels(); }, [fetchModels]);

  const handleSetDefault = async (id: number) => {
    try {
      await modelApi.setDefault(id);
      message.success('已设为默认');
      fetchModels();
    } catch { message.error('操作失败'); }
  };

  const handleToggleStatus = async (id: number, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
      await modelApi.setStatus(id, newStatus);
      fetchModels();
    } catch { message.error('操作失败'); }
  };

  const handleRemove = (id: number) => {
    Modal.confirm({
      title: '确认移除',
      content: '移除后该模型将不可使用，确定吗？',
      onOk: async () => {
        try {
          await modelApi.delete(id);
          message.success('已移除');
          fetchModels();
        } catch { message.error('移除失败'); }
      },
    });
  };

  const handleAdd = async () => {
    try {
      const values = await form.validateFields();
      await modelApi.create({
        name: values.alias || values.modelName,
        alias: values.alias,
        provider: values.provider,
        modelName: values.modelName,
        apiKey: values.apiKey,
        endpointUrl: values.baseUrl,
        capability: values.capability,
        contextWindow: values.contextWindow,
        maxOutput: values.maxOutput,
        userLimit: values.userLimit,
        isPublic: values.isPublic,
      });
      message.success('添加成功');
      setAddModalOpen(false);
      form.resetFields();
      fetchModels();
    } catch (err: any) {
      message.error(err.response?.data?.message || '添加失败');
    }
  };

  const filtered = models.filter(m =>
    !search || (m.name || '').toLowerCase().includes(search.toLowerCase()) || (m.provider || '').includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>模型管理</h2>
        <Space>
          <Input placeholder="搜索模型别名/模型名/提供商" prefix={<SearchOutlined />} value={search} onChange={e => setSearch(e.target.value)} style={{ width: 280, borderRadius: 8 }} allowClear />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddModalOpen(true)} style={{ background: '#1a1a2e', borderRadius: 8 }}>添加模型</Button>
        </Space>
      </div>

      <Tabs activeKey={tab} onChange={setTab} items={capabilityTabs} style={{ marginBottom: 16 }} />

      {filtered.length === 0 && !loading ? <Empty description="暂无模型" /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {filtered.map(model => (
            <Card key={model.id} hoverable loading={loading} style={{ borderRadius: 12, opacity: model.status === 'disabled' ? 0.6 : 1, border: model.isDefault ? '2px solid #1a1a2e' : '1px solid #f0f0f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#1a1a2e' }}>
                  {providerLogos[model.provider] || (model.provider || '?')[0].toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{model.alias || model.name}</div>
                  <div style={{ fontSize: 12, color: '#999' }}>{model.modelName}</div>
                </div>
                <Tag color={model.status === 'active' ? 'green' : 'default'}>{model.status === 'active' ? '● 启用中' : '● 已停用'}</Tag>
              </div>

              <Space style={{ marginBottom: 12 }}>
                <Tag color={model.isPublic ? 'blue' : 'red'}>{model.isPublic ? '公共' : '私有'}</Tag>
                <Tag>{capabilityTabs.find(t => t.key === model.capability)?.label || model.capability}</Tag>
              </Space>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>{model.contextWindow ? `${(model.contextWindow / 1000).toFixed(0)}k` : '-'}</div>
                  <div style={{ fontSize: 11, color: '#999' }}>上下文</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>{model.userLimit?.toLocaleString() || '-'}</div>
                  <div style={{ fontSize: 11, color: '#999' }}>限额</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>{model.maxOutput?.toLocaleString() || '-'}</div>
                  <div style={{ fontSize: 11, color: '#999' }}>最大输出</div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Checkbox checked={model.isDefault} onChange={() => handleSetDefault(model.id)} disabled={model.status === 'disabled'}>
                  {model.isDefault ? <Tag color="blue">默认</Tag> : '设为默认'}
                </Checkbox>
                <Space>
                  <Button type="link" size="small" danger={model.status === 'active'} onClick={() => handleToggleStatus(model.id, model.status)}>
                    {model.status === 'active' ? '停用' : '启用'}
                  </Button>
                  <Button type="link" size="small" onClick={() => handleRemove(model.id)}>移除</Button>
                </Space>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal title="添加模型" open={addModalOpen} onCancel={() => setAddModalOpen(false)} onOk={handleAdd} width={560} okText="确认添加"
        okButtonProps={{ style: { background: '#1a1a2e' } }}>
        <Form form={form} layout="vertical" initialValues={{ capability: 'text', isPublic: true, contextWindow: 128000, maxOutput: 4096, userLimit: 200000 }}
          onValuesChange={(changed) => { if (changed.provider) form.setFieldValue('baseUrl', providerDefaults[changed.provider]?.baseUrl || ''); }}>
          <Form.Item name="provider" label="模型提供商" rules={[{ required: true }]}>
            <Select options={[
              { label: '智谱 (Zhipu)', value: 'zhipu' }, { label: 'Qwen (通义)', value: 'qwen' },
              { label: 'DeepSeek', value: 'deepseek' }, { label: 'OpenAI', value: 'openai' },
              { label: 'Anthropic', value: 'anthropic' }, { label: 'MiniMax', value: 'minimax' },
              { label: 'Ollama (本地)', value: 'ollama' }, { label: '自定义', value: 'custom' },
            ]} />
          </Form.Item>
          <Form.Item name="baseUrl" label="Base URL" rules={[{ required: true }]}><Input placeholder="https://..." /></Form.Item>
          <Form.Item name="apiKey" label="API Key" rules={[{ required: true }]}><Input.Password placeholder="sk-xxx" /></Form.Item>
          <Form.Item name="modelName" label="模型名称" rules={[{ required: true }]}><Input placeholder="glm-4-plus" /></Form.Item>
          <Form.Item name="alias" label="模型别名"><Input placeholder="GLM-4-Plus" /></Form.Item>
          <Form.Item name="capability" label="能力类型">
            <Select options={capabilityTabs.filter(t => t.key !== 'all').map(t => ({ label: t.label, value: t.key }))} />
          </Form.Item>
          <Space>
            <Form.Item name="contextWindow" label="上下文窗口"><InputNumber style={{ width: 150 }} /></Form.Item>
            <Form.Item name="userLimit" label="单用户限额"><InputNumber style={{ width: 150 }} /></Form.Item>
            <Form.Item name="maxOutput" label="最大输出"><InputNumber style={{ width: 150 }} /></Form.Item>
          </Space>
          <Form.Item name="isPublic" label="可见性">
            <Radio.Group options={[{ label: '公共', value: true }, { label: '私有', value: false }]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ModelsPage;
