import React, { useState, useEffect } from 'react';
import { Card, Tag, Button, Space, Modal, Form, Input, Select, Tabs, Typography, Badge, Divider, message, Table } from 'antd';
import { PlusOutlined, SettingOutlined, LinkOutlined, PoweroffOutlined, SendOutlined, CodeOutlined } from '@ant-design/icons';
import { channelApi, agentApi } from '@/services/request';

const { Text, Paragraph } = Typography;

const channelTypeConfig: Record<string, { icon: string; label: string; color: string; fields: string[] }> = {
  feishu: { icon: '📱', label: '飞书', color: '#3370ff', fields: ['appId', 'appSecret', 'encryptKey', 'verificationToken'] },
  wechat: { icon: '💬', label: '微信公众号', color: '#07c160', fields: ['appId', 'appSecret', 'token', 'encodingAesKey'] },
  web: { icon: '🌐', label: 'Web 嵌入', color: '#1a1a2e', fields: [] },
  portal: { icon: '🏫', label: '校园门户', color: '#722ed1', fields: ['portalUrl', 'embedType'] },
  dingtalk: { icon: '🔵', label: '钉钉', color: '#0089ff', fields: ['appKey', 'appSecret', 'robotCode'] },
};

const agentTypeRouteInfo: Record<string, { method: string; desc: string }> = {
  openclaw: { method: 'OpenClaw Channel 原生路由', desc: '消息通过 OpenClaw Channel 插件直接路由到 Agent，配置 AgentBinding.match 匹配规则' },
  lowcode: { method: 'Webhook 桥接转发', desc: '渠道消息 → 后端转发 → 低代码平台 API → 返回结果 → 推送到渠道' },
  api: { method: '后端代理转发', desc: '渠道消息 → 后端代理 → 调用自定义 API → 返回结果 → 推送到渠道' },
};

const ChannelsPage: React.FC = () => {
  const [channels, setChannels] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);

  useEffect(() => {
    channelApi.list().then((res: any) => setChannels(res.data || [])).catch(() => {});
    agentApi.publicList().then((res: any) => setAgents(res.data || [])).catch(() => {});
  }, []);
  const [tab, setTab] = useState('all');
  const [addOpen, setAddOpen] = useState(false);
  const [bindOpen, setBindOpen] = useState(false);
  const [embedOpen, setEmbedOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<any>(null);
  const [form] = Form.useForm();
  const [bindForm] = Form.useForm();

  const filtered = channels.filter(c => tab === 'all' || c.channelType === tab);

  const handleAdd = () => {
    form.validateFields().then(values => {
      setChannels([...channels, { id: Date.now(), ...values, status: 'active', boundAgents: [] }]);
      setAddOpen(false);
      form.resetFields();
      message.success('渠道添加成功');
    });
  };

  const handleBind = () => {
    bindForm.validateFields().then(values => {
      if (selectedChannel) {
        setChannels(channels.map(c => c.id === selectedChannel.id
          ? { ...c, boundAgents: [...c.boundAgents, values.agentName] } : c));
      }
      setBindOpen(false);
      bindForm.resetFields();
      message.success('Agent 绑定成功');
    });
  };

  const embedCode = `<!-- 高教AI平台 - 智能助手嵌入代码 -->
<script src="https://edu-ai.example.com/embed.js"></script>
<div id="edu-ai-chat" data-agent="main" data-theme="light"></div>`;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>渠道管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddOpen(true)} style={{ background: '#1a1a2e', borderRadius: 8 }}>添加渠道</Button>
      </div>

      <div style={{ padding: '12px 16px', background: '#f6f8fa', borderRadius: 8, marginBottom: 16, fontSize: 13, color: '#666' }}>
        <Text strong>渠道接入方式因 Agent 类型而异：</Text>
        <div style={{ display: 'flex', gap: 24, marginTop: 8 }}>
          {Object.entries(agentTypeRouteInfo).map(([type, info]) => (
            <div key={type} style={{ flex: 1, padding: '8px 12px', background: '#fff', borderRadius: 6, border: '1px solid #e8e8e8' }}>
              <Tag color={type === 'openclaw' ? 'blue' : type === 'lowcode' ? 'purple' : 'orange'}>
                {type === 'openclaw' ? 'OpenClaw Agent' : type === 'lowcode' ? '低代码平台' : '高代码(API)'}
              </Tag>
              <div style={{ fontSize: 12, marginTop: 4 }}><Text strong>{info.method}</Text></div>
              <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{info.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <Tabs activeKey={tab} onChange={setTab} items={[
        { key: 'all', label: '全部' },
        ...Object.entries(channelTypeConfig).map(([k, v]) => ({ key: k, label: `${v.icon} ${v.label}` })),
      ]} style={{ marginBottom: 16 }} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
        {filtered.map(channel => {
          const config = channelTypeConfig[channel.channelType] || channelTypeConfig.web;
          return (
            <Card key={channel.id} hoverable style={{ borderRadius: 12, borderLeft: `4px solid ${config.color}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <span style={{ fontSize: 28 }}>{config.icon}</span>
                <div style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: 600 }}>{channel.name}</Text>
                  <div><Badge status={channel.status === 'active' ? 'success' : 'default'} text={channel.status === 'active' ? '在线' : '未启用'} /></div>
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>绑定的智能体：</Text>
                <div style={{ marginTop: 4 }}>
                  {channel.boundAgents.length > 0
                    ? channel.boundAgents.map((a: string, i: number) => <Tag key={i}>{a}</Tag>)
                    : <Text type="secondary" style={{ fontSize: 12 }}>暂未绑定</Text>}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Button size="small" icon={<SettingOutlined />}>配置</Button>
                <Button size="small" icon={<LinkOutlined />} onClick={() => { setSelectedChannel(channel); setBindOpen(true); }}>绑定Agent</Button>
                {channel.channelType === 'web' || channel.channelType === 'portal'
                  ? <Button size="small" icon={<CodeOutlined />} onClick={() => setEmbedOpen(true)}>嵌入代码</Button>
                  : <Button size="small" icon={<SendOutlined />} onClick={() => message.info('测试消息已发送（Mock）')}>测试</Button>}
                <Button size="small" danger icon={<PoweroffOutlined />}>{channel.status === 'active' ? '停用' : '启用'}</Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Add Channel Modal */}
      <Modal title="添加渠道" open={addOpen} onCancel={() => setAddOpen(false)} onOk={handleAdd} width={520} okText="添加" okButtonProps={{ style: { background: '#1a1a2e' } }}>
        <Form form={form} layout="vertical" initialValues={{ channelType: 'feishu' }}>
          <Form.Item name="channelType" label="渠道类型" rules={[{ required: true }]}>
            <Select options={Object.entries(channelTypeConfig).map(([k, v]) => ({ label: `${v.icon} ${v.label}`, value: k }))} />
          </Form.Item>
          <Form.Item name="name" label="渠道名称" rules={[{ required: true }]}><Input placeholder="如：飞书机器人" /></Form.Item>
          <Divider orientation="left" style={{ fontSize: 13 }}>平台凭证</Divider>
          <Form.Item name="appId" label="App ID"><Input placeholder="cli_xxxx" /></Form.Item>
          <Form.Item name="appSecret" label="App Secret"><Input.Password placeholder="应用密钥" /></Form.Item>
          <Form.Item name="token" label="Verification Token"><Input placeholder="验证 Token（可选）" /></Form.Item>
          <Button icon={<LinkOutlined />} onClick={() => message.success('连接测试成功（Mock）')}>🔗 测试连接</Button>
        </Form>
      </Modal>

      {/* Bind Agent Modal */}
      <Modal title={`绑定智能体到 "${selectedChannel?.name || ''}"`} open={bindOpen} onCancel={() => setBindOpen(false)} onOk={handleBind} okText="绑定">
        <Form form={bindForm} layout="vertical">
          <Form.Item name="agentName" label="选择智能体" rules={[{ required: true }]}>
            <Select options={agents.map((a: any) => ({
              label: <span>{a.avatar} {a.name} <Tag>{a.agentType === 'openclaw' ? 'OpenClaw' : a.agentType === 'lowcode' ? '低代码' : 'API'}</Tag></span>,
              value: a.name,
            }))} />
          </Form.Item>
          <Form.Item name="routeNote" label="">
            <div style={{ padding: '8px 12px', background: '#fffbe6', borderRadius: 6, fontSize: 12, border: '1px solid #ffe58f' }}>
              绑定后，来自该渠道的消息将路由到所选智能体。不同类型 Agent 的路由方式不同，请确保对应的后端服务已配置。
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* Embed Code Modal */}
      <Modal title="嵌入代码" open={embedOpen} onCancel={() => setEmbedOpen(false)} footer={<Button type="primary" onClick={() => { navigator.clipboard.writeText(embedCode); message.success('已复制到剪贴板'); }}>复制代码</Button>}>
        <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, fontSize: 12, overflow: 'auto' }}>{embedCode}</pre>
        <Text type="secondary" style={{ fontSize: 12 }}>将上述代码粘贴到校园门户网站的 HTML 页面中即可嵌入 AI 助手。</Text>
      </Modal>
    </div>
  );
};

export default ChannelsPage;
