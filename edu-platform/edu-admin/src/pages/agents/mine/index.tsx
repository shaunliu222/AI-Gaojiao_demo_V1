import React, { useState, useEffect } from 'react';
import { Card, Tag, Input, Button, Space, Avatar, Typography, Modal, Steps, Form, Select, Tabs, Radio, Switch, Divider, Tooltip, message } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, SendOutlined, InfoCircleOutlined, SettingOutlined, CrownOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { agentApi, modelApi, skillApi, mcpApi } from '@/services/request';
import { useNavigate } from 'react-router-dom';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

const thinkingLevels = [
  { label: '关闭', value: 'off' }, { label: '最小', value: 'minimal' },
  { label: '低', value: 'low' }, { label: '中', value: 'medium' },
  { label: '高', value: 'high' }, { label: '极高', value: 'xhigh' },
  { label: '自适应（推荐）', value: 'adaptive' },
];

// Main Agent default config (corresponds to OpenClaw agents.list default:true)
const mainAgentConfig = {
  id: 'main',
  agentId: 'main',
  name: 'Main Agent',
  description: '平台默认智能体，与所有渠道（飞书/微信/Web）的默认对话一致。基于 OpenClaw 配置中 default: true 的 Agent。',
  avatar: '🤖',
  agentType: 'openclaw' as const,
  status: 'published',
  isPublic: true,
  isDefault: true,
  useCount: 5678,
  owner: 'system',
  primaryModel: 'GLM-4-Plus',
  fallbackModels: ['Qwen-Max'],
  skills: ['教务查询', '知识库检索'],
  mcpServers: ['教务系统 MCP'],
  thinkingDefault: 'adaptive',
};

const agentTypeTag: Record<string, { color: string; label: string }> = {
  openclaw: { color: 'blue', label: 'OpenClaw' },
  lowcode: { color: 'purple', label: '低代码' },
  api: { color: 'orange', label: 'API' },
};

const AgentMinePage: React.FC = () => {
  const [agents, setAgents] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);
  const [mcpServers, setMcpServers] = useState<any[]>([]);

  useEffect(() => {
    agentApi.list({ page: 1, size: 100 }).then((res: any) => setAgents(res.data?.list || [])).catch(() => {});
    modelApi.list().then((res: any) => setModels(res.data || [])).catch(() => {});
    skillApi.list().then((res: any) => setSkills(res.data || [])).catch(() => {});
    mcpApi.list().then((res: any) => setMcpServers(res.data || [])).catch(() => {});
  }, []);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [mainConfigOpen, setMainConfigOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [agentType, setAgentType] = useState<'openclaw' | 'lowcode' | 'api'>('openclaw');
  const [form] = Form.useForm();
  const [mainForm] = Form.useForm();
  const navigate = useNavigate();

  const filtered = agents.filter(a => {
    const matchSearch = !search || a.name.includes(search);
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleCreate = () => {
    form.validateFields().then(values => {
      const newAgent = { id: Date.now(), ...values, agentType, status: 'draft', isPublic: false, useCount: 0, avatar: '🤖', owner: 'current' };
      setAgents([newAgent, ...agents]);
      setCreateOpen(false);
      setStep(0);
      form.resetFields();
      message.success('智能体创建成功');
    });
  };

  const resetCreate = () => { setCreateOpen(false); setStep(0); setAgentType('openclaw'); form.resetFields(); };

  const stepItems = agentType === 'openclaw'
    ? [{ title: '搭建方式' }, { title: '基础信息' }, { title: '模型配置' }, { title: '工具与能力' }, { title: '权限发布' }]
    : agentType === 'lowcode'
    ? [{ title: '搭建方式' }, { title: '平台配置' }, { title: '选择应用' }, { title: '权限发布' }]
    : [{ title: '搭建方式' }, { title: 'API 配置' }, { title: '权限发布' }];

  const maxStep = stepItems.length - 1;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>我的智能体</h2>
        <Space>
          <Input placeholder="搜索..." prefix={<SearchOutlined />} value={search} onChange={e => setSearch(e.target.value)} style={{ width: 200, borderRadius: 8 }} allowClear />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)} style={{ background: '#1a1a2e', borderRadius: 8 }}>创建智能体</Button>
        </Space>
      </div>

      <Tabs activeKey={statusFilter} onChange={setStatusFilter} items={[
        { key: 'all', label: '全部' }, { key: 'published', label: '已发布' },
        { key: 'draft', label: '草稿' }, { key: 'disabled', label: '已停用' },
        { key: 'joined', label: '从广场加入' },
      ]} style={{ marginBottom: 16 }} />

      {/* Main Agent - Default, pinned to top, not deletable */}
      {(statusFilter === 'all' || statusFilter === 'published') && (
        <Card style={{ borderRadius: 12, marginBottom: 16, border: '2px solid #faad14', background: 'linear-gradient(135deg, #fffbe6 0%, #fff 100%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Avatar size={56} style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', fontSize: 28, flexShrink: 0 }}>🤖</Avatar>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Text style={{ fontSize: 18, fontWeight: 700 }}>Main Agent</Text>
                <Tag color="gold" icon={<CrownOutlined />}>默认</Tag>
                <Tag color="blue">OpenClaw</Tag>
                <Tag color="green">已发布</Tag>
              </div>
              <Paragraph type="secondary" style={{ margin: 0, fontSize: 13 }}>
                {mainAgentConfig.description}
              </Paragraph>
              <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 12 }}>
                <span>主模型: <Tag>{mainAgentConfig.primaryModel}</Tag></span>
                <span>备选: {mainAgentConfig.fallbackModels.map(m => <Tag key={m}>{m}</Tag>)}</span>
                <span>Skills: {mainAgentConfig.skills.map(s => <Tag key={s} color="blue">{s}</Tag>)}</span>
                <span>MCP: {mainAgentConfig.mcpServers.map(m => <Tag key={m} color="purple">{m}</Tag>)}</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
              <Button icon={<SettingOutlined />} onClick={() => {
                mainForm.setFieldsValue({
                  primaryModel: `zhipu/${mainAgentConfig.primaryModel.toLowerCase().replace(/-/g, '-')}`,
                  fallbackModels: [],
                  skills: mainAgentConfig.skills,
                  mcpServers: mainAgentConfig.mcpServers,
                  thinkingDefault: mainAgentConfig.thinkingDefault,
                });
                setMainConfigOpen(true);
              }}>配置</Button>
              <Button icon={<PlayCircleOutlined />} onClick={() => navigate('/chat')}>测试</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Other agents grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {filtered.map(agent => (
          <Card key={agent.id} hoverable style={{ borderRadius: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <Avatar size={48} style={{ background: '#f5f5f5', fontSize: 24 }}>{agent.avatar}</Avatar>
              <div style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: 600 }}>{agent.name}</Text>
                <div>
                  <Tag color={agent.isPublic ? 'blue' : 'red'}>{agent.isPublic ? '公共' : '私有'}</Tag>
                  <Tag color={agent.status === 'published' ? 'green' : agent.status === 'draft' ? 'default' : 'red'}>{agent.status}</Tag>
                  <Tag>{agent.agentType === 'openclaw' ? 'OpenClaw' : agent.agentType === 'lowcode' ? '低代码' : 'API'}</Tag>
                </div>
              </div>
            </div>
            <Paragraph type="secondary" ellipsis={{ rows: 2 }} style={{ minHeight: 44 }}>{agent.description}</Paragraph>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>{agent.useCount} 使用</Text>
              <Space>
                <Button type="link" size="small" icon={<EditOutlined />}>编辑</Button>
                <Button type="link" size="small" icon={<SendOutlined />}>发布</Button>
                <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
              </Space>
            </div>
          </Card>
        ))}
      </div>

      {/* Create Agent Modal */}
      <Modal title="创建智能体" open={createOpen} onCancel={resetCreate} footer={null} width={700} destroyOnClose>
        <Steps current={step} size="small" style={{ marginBottom: 24 }} items={stepItems} />
        <Form form={form} layout="vertical" preserve={false}>

          {/* Step 0: Choose type */}
          {step === 0 && (
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
              {[
                { value: 'openclaw' as const, label: 'OpenClaw Agent', desc: '通过 Skill / MCP 编排，功能最强', icon: '⚡' },
                { value: 'lowcode' as const, label: '低代码开发平台', desc: '可视化编排，拖拽搭建', icon: '🧩' },
                { value: 'api' as const, label: '高代码 (API)', desc: '自定义 REST API 接入', icon: '🔌' },
              ].map(opt => (
                <Card key={opt.value} hoverable onClick={() => setAgentType(opt.value)}
                  style={{ width: 200, textAlign: 'center', border: agentType === opt.value ? '2px solid #1a1a2e' : '1px solid #f0f0f0', borderRadius: 12 }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>{opt.icon}</div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{opt.label}</div>
                  <Text type="secondary" style={{ fontSize: 12 }}>{opt.desc}</Text>
                </Card>
              ))}
            </div>
          )}

          {/* OpenClaw: Step 1 - Basic Info */}
          {step === 1 && agentType === 'openclaw' && (<>
            <Form.Item name="agentId" label={<>Agent ID <Tooltip title="唯一标识，英文+数字+连字符，如 math-tutor"><InfoCircleOutlined /></Tooltip></>} rules={[{ required: true }, { pattern: /^[a-z0-9-]+$/, message: '仅支持小写英文、数字、连字符' }]}>
              <Input placeholder="math-tutor" />
            </Form.Item>
            <Form.Item name="name" label="显示名称" rules={[{ required: true }]}><Input placeholder="数学辅导助手" /></Form.Item>
            <Form.Item name="description" label="描述"><TextArea rows={2} placeholder="描述该智能体的能力和用途" /></Form.Item>
            <Form.Item name="category" label="分类"><Select options={[
              { label: '教学', value: 'teaching' }, { label: '科研', value: 'research' },
              { label: '实训', value: 'training' }, { label: '管理', value: 'management' }, { label: '通用', value: 'general' },
            ]} /></Form.Item>
            <Form.Item name="isDefault" label="设为默认 Agent" valuePropName="checked"><Switch /></Form.Item>
          </>)}

          {/* OpenClaw: Step 2 - Model Config (from Model Management) */}
          {step === 2 && agentType === 'openclaw' && (<>
            <div style={{ padding: '12px 16px', background: '#f6f8fa', borderRadius: 8, marginBottom: 16, fontSize: 13, color: '#666' }}>
              以下模型列表来自"模型管理"中已启用的模型。如需添加新模型，请先前往 <a href="/models">模型管理</a> 页面配置。
            </div>
            <Form.Item name="primaryModel" label="主模型" rules={[{ required: true, message: '请选择主模型' }]}>
              <Select placeholder="选择主模型" options={models.map(m => ({
                label: <span>{m.alias || m.name} <Tag style={{ marginLeft: 4 }}>{m.provider}</Tag> <span style={{ color: '#999', fontSize: 12 }}>{m.modelName}</span></span>,
                value: `${m.provider}/${m.modelName}`,
              }))} />
            </Form.Item>
            <Form.Item name="fallbackModels" label={<>备选模型 <Tooltip title="主模型不可用时自动切换。对应 AgentModelConfig.fallbacks"><InfoCircleOutlined /></Tooltip></>}>
              <Select mode="multiple" placeholder="选择备选模型（可选）" options={models.map(m => ({
                label: `${m.alias || m.name} (${m.provider}) ${m.modelName}`,
                value: `${m.provider}/${m.modelName}`,
              }))} />
            </Form.Item>
            <Divider orientation="left" style={{ fontSize: 13 }}>推理参数</Divider>
            <Space wrap>
              <Form.Item name="thinkingDefault" label="思考级别" initialValue="adaptive">
                <Select style={{ width: 180 }} options={thinkingLevels} />
              </Form.Item>
              <Form.Item name="reasoningDefault" label="推理可见" initialValue="on">
                <Select style={{ width: 120 }} options={[{ label: '显示', value: 'on' }, { label: '隐藏', value: 'off' }, { label: '流式', value: 'stream' }]} />
              </Form.Item>
              <Form.Item name="fastModeDefault" label="快速模式" valuePropName="checked"><Switch /></Form.Item>
            </Space>
          </>)}

          {/* OpenClaw: Step 3 - Tools & Capabilities */}
          {step === 3 && agentType === 'openclaw' && (<>
            <Form.Item name="skills" label="Skills（从 Skill Hub 选择）">
              <Select mode="multiple" placeholder="选择 Skills" options={skills.map(s => ({ label: `⚡ ${s.name} — ${s.description}`, value: s.name }))} />
            </Form.Item>
            <Form.Item name="mcpServers" label="MCP Server（从插件中心选择）">
              <Select mode="multiple" placeholder="选择 MCP Server" options={mcpServers.filter(m => m.status === 'active').map(m => ({ label: `🔌 ${m.name} (${m.transportType})`, value: m.name }))} />
            </Form.Item>
            <Form.Item name="memorySearch" label="记忆搜索" valuePropName="checked" initialValue={true}>
              <Switch checkedChildren="启用" unCheckedChildren="关闭" />
            </Form.Item>
            <Form.Item name="allowSubagents" label={<>子 Agent <Tooltip title="允许该 Agent 调用其他 Agent。对应 subagents.allowAgents"><InfoCircleOutlined /></Tooltip></>} valuePropName="checked">
              <Switch checkedChildren="允许" unCheckedChildren="禁止" />
            </Form.Item>
            <Divider orientation="left" style={{ fontSize: 13 }}>高级配置</Divider>
            <Form.Item name="toolsConfig" label="工具配置（JSON，可选）">
              <TextArea rows={4} placeholder='{"web_search": {"enabled": true}, "bash": {"enabled": false}}' style={{ fontFamily: 'monospace', fontSize: 12 }} />
            </Form.Item>
          </>)}

          {/* OpenClaw: Step 4 - Permissions & Publish */}
          {step === 4 && agentType === 'openclaw' && (<>
            <Form.Item name="isPublic" label="可见性" initialValue={false}>
              <Radio.Group options={[{ label: '私有', value: false }, { label: '公共（全校可用）', value: true }]} />
            </Form.Item>
            <Form.Item name="authorizedOrgs" label="授权学院（公共时生效）">
              <Select mode="multiple" placeholder="选择授权学院" options={[
                { label: '计算机学院', value: 'CS' }, { label: '信息工程学院', value: 'IE' },
                { label: '数学学院', value: 'MATH' }, { label: '全校', value: 'ALL' },
              ]} />
            </Form.Item>
            <Form.Item name="publishChannels" label="发布渠道">
              <Select mode="multiple" placeholder="选择发布渠道" options={[
                { label: '🌐 Web（管理后台）', value: 'web' }, { label: '📱 飞书', value: 'feishu' },
                { label: '💬 微信', value: 'wechat' }, { label: '🏫 校园门户', value: 'portal' },
              ]} />
            </Form.Item>
          </>)}

          {/* Low-code: Step 1 - Platform Config */}
          {step === 1 && agentType === 'lowcode' && (<>
            <Form.Item name="name" label="智能体名称" rules={[{ required: true }]}><Input placeholder="名称" /></Form.Item>
            <Form.Item name="description" label="描述"><TextArea rows={2} /></Form.Item>
            <Form.Item name="lowcodeUrl" label="低代码平台地址" rules={[{ required: true }]}><Input placeholder="https://your-lowcode-platform.com" /></Form.Item>
            <Form.Item name="lowcodeApiKey" label="API Key"><Input.Password placeholder="平台 API Key" /></Form.Item>
            <Button type="primary" ghost>🔗 测试连接</Button>
          </>)}

          {/* Low-code: Step 2 - Select App */}
          {step === 2 && agentType === 'lowcode' && (<>
            <Form.Item name="lowcodeApp" label="选择已发布的应用">
              <Radio.Group style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {['智能客服工作流', '文档摘要应用', '知识问答Bot'].map(app => (
                  <Radio.Button key={app} value={app} style={{ height: 48, display: 'flex', alignItems: 'center', borderRadius: 8 }}>{app}</Radio.Button>
                ))}
              </Radio.Group>
            </Form.Item>
          </>)}

          {/* Low-code: Step 3 or API: Step 2 - Permissions */}
          {((step === 3 && agentType === 'lowcode') || (step === 2 && agentType === 'api')) && (<>
            <Form.Item name="isPublic" label="可见性" initialValue={false}>
              <Radio.Group options={[{ label: '私有', value: false }, { label: '公共', value: true }]} />
            </Form.Item>
            <Form.Item name="publishChannels" label="发布渠道">
              <Select mode="multiple" placeholder="选择发布渠道" options={[
                { label: 'Web', value: 'web' }, { label: '飞书', value: 'feishu' },
                { label: '微信', value: 'wechat' }, { label: '门户', value: 'portal' },
              ]} />
            </Form.Item>
          </>)}

          {/* API: Step 1 - Config */}
          {step === 1 && agentType === 'api' && (<>
            <Form.Item name="name" label="智能体名称" rules={[{ required: true }]}><Input placeholder="名称" /></Form.Item>
            <Form.Item name="description" label="描述"><TextArea rows={2} /></Form.Item>
            <Form.Item name="apiEndpoint" label="API 端点" rules={[{ required: true }]}><Input placeholder="https://api.example.com/chat" /></Form.Item>
            <Form.Item name="apiMethod" label="请求方式" initialValue="POST"><Select options={[{ label: 'POST', value: 'POST' }, { label: 'GET', value: 'GET' }]} /></Form.Item>
            <Form.Item name="apiHeaders" label="Headers（JSON）"><TextArea rows={2} placeholder='{"Authorization": "Bearer xxx"}' style={{ fontFamily: 'monospace' }} /></Form.Item>
            <Form.Item name="apiBodyTemplate" label="请求体模板"><TextArea rows={3} placeholder='{"message": "{{message}}", "stream": true}' style={{ fontFamily: 'monospace' }} /></Form.Item>
            <Form.Item name="apiResponsePath" label="响应解析路径"><Input placeholder="$.data.reply" /></Form.Item>
          </>)}

        </Form>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20, borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
          {step > 0 && <Button onClick={() => setStep(step - 1)}>上一步</Button>}
          {step < maxStep ? (
            <Button type="primary" onClick={() => setStep(step + 1)} style={{ background: '#1a1a2e' }}>下一步</Button>
          ) : (
            <><Button onClick={handleCreate}>保存草稿</Button><Button type="primary" onClick={handleCreate} style={{ background: '#1a1a2e' }}>发布</Button></>
          )}
        </div>
      </Modal>

      {/* Main Agent Config Modal */}
      <Modal title="配置 Main Agent（默认智能体）" open={mainConfigOpen} onCancel={() => setMainConfigOpen(false)} width={600}
        onOk={() => { mainForm.validateFields().then(() => { message.success('Main Agent 配置已更新（将同步到 OpenClaw 配置）'); setMainConfigOpen(false); }); }}
        okText="保存配置" okButtonProps={{ style: { background: '#1a1a2e' } }}>
        <div style={{ padding: '8px 12px', background: '#fffbe6', borderRadius: 8, marginBottom: 16, fontSize: 12, border: '1px solid #ffe58f' }}>
          此配置对应 OpenClaw <code>agents.list</code> 中 <code>default: true</code> 的 Agent。修改后将同步更新 OpenClaw Gateway 配置，影响所有渠道（飞书/微信/Web）的默认对话行为。
        </div>
        <Form form={mainForm} layout="vertical">
          <Form.Item name="primaryModel" label="主模型（从模型管理已配置列表选择）" rules={[{ required: true }]}>
            <Select options={models.map(m => ({
              label: <span>{m.alias || m.name} <Tag style={{ marginLeft: 4 }}>{m.provider}</Tag> <span style={{ color: '#999', fontSize: 12 }}>{m.modelName}</span></span>,
              value: `${m.provider}/${m.modelName}`,
            }))} />
          </Form.Item>
          <Form.Item name="fallbackModels" label="备选模型">
            <Select mode="multiple" placeholder="选择备选模型（可选）" options={models.map(m => ({
              label: `${m.alias || m.name} (${m.provider}) ${m.modelName}`, value: `${m.provider}/${m.modelName}`,
            }))} />
          </Form.Item>
          <Form.Item name="thinkingDefault" label="思考级别">
            <Select options={thinkingLevels} />
          </Form.Item>
          <Divider orientation="left" style={{ fontSize: 13 }}>工具与能力</Divider>
          <Form.Item name="skills" label="Skills">
            <Select mode="multiple" options={skills.map(s => ({ label: `⚡ ${s.name}`, value: s.name }))} />
          </Form.Item>
          <Form.Item name="mcpServers" label="MCP Server">
            <Select mode="multiple" options={mcpServers.filter(m => m.status === 'active').map(m => ({ label: `🔌 ${m.name}`, value: m.name }))} />
          </Form.Item>
          <Form.Item name="memorySearch" label="记忆搜索" valuePropName="checked" initialValue={true}>
            <Switch checkedChildren="启用" unCheckedChildren="关闭" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AgentMinePage;
