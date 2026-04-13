import React, { useState, useEffect } from 'react';
import { Card, Tag, Input, Tabs, Button, Avatar, Typography, message, Modal } from 'antd';
import { SearchOutlined, UserOutlined, PlusOutlined, CheckOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { agentApi } from '@/services/request';

const { Text, Paragraph } = Typography;

const categoryTabs = [
  { key: 'all', label: '全部' }, { key: 'teaching', label: '教学' },
  { key: 'research', label: '科研' }, { key: 'training', label: '实训' },
  { key: 'management', label: '管理' }, { key: 'general', label: '通用' },
];

const agentTypeTag: Record<string, { color: string; label: string }> = {
  openclaw: { color: 'blue', label: 'OpenClaw' },
  lowcode: { color: 'purple', label: '低代码' },
  api: { color: 'orange', label: 'API' },
};

const AgentExplorePage: React.FC = () => {
  const [agents, setAgents] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');
  const [myAgentIds, setMyAgentIds] = useState<Set<number>>(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    agentApi.publicList().then((res: any) => setAgents(res.data || [])).catch(() => message.error('加载失败'));
  }, []);

  const filtered = agents.filter(a => {
    const matchSearch = !search || a.name?.includes(search) || a.description?.includes(search);
    const matchTab = tab === 'all' || a.category === tab;
    return matchSearch && matchTab;
  });

  const handleTry = (agent: any) => {
    if (agent.agentType === 'openclaw') {
      navigate('/chat');
    } else {
      Modal.info({ title: agent.name, content: `该智能体通过${agentTypeTag[agent.agentType]?.label || '外部'}平台提供服务。` });
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>智能体广场</h2>
        <Input placeholder="搜索智能体名称/描述" prefix={<SearchOutlined />} value={search}
          onChange={e => setSearch(e.target.value)} style={{ width: 280, borderRadius: 8 }} allowClear />
      </div>
      <Tabs activeKey={tab} onChange={setTab} items={categoryTabs} style={{ marginBottom: 16 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {filtered.map((agent: any) => {
          const typeInfo = agentTypeTag[agent.agentType] || agentTypeTag.openclaw;
          const isAdded = myAgentIds.has(agent.id);
          return (
            <Card key={agent.id} hoverable style={{ borderRadius: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <Avatar size={48} style={{ background: '#f5f5f5', fontSize: 24, flexShrink: 0 }}>{agent.avatar || '🤖'}</Avatar>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 16, fontWeight: 600 }}>{agent.name}</Text>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
                    <Tag color={agent.isPublic ? 'blue' : 'red'}>{agent.isPublic ? '官方' : '私有'}</Tag>
                    <Tag color={typeInfo.color}>{typeInfo.label}</Tag>
                  </div>
                </div>
              </div>
              <Paragraph type="secondary" ellipsis={{ rows: 2 }} style={{ minHeight: 44, marginBottom: 12 }}>
                {agent.description}
              </Paragraph>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  <UserOutlined /> {(agent.useCount || 0).toLocaleString()} 使用
                </Text>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button size="small" type="primary" onClick={() => handleTry(agent)}
                    style={{ borderRadius: 6, background: '#1a1a2e', fontSize: 12 }}>试用</Button>
                  <Button size="small" onClick={() => { setMyAgentIds(prev => { const n = new Set(prev); isAdded ? n.delete(agent.id) : n.add(agent.id); return n; }); }}
                    type={isAdded ? 'default' : 'dashed'} icon={isAdded ? <CheckOutlined /> : <PlusOutlined />}
                    style={{ borderRadius: 6, fontSize: 12, color: isAdded ? '#52c41a' : undefined }}>
                    {isAdded ? '已加入' : '加入我的'}
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default AgentExplorePage;
