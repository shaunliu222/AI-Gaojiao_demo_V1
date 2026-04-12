import React, { useState } from 'react';
import { Card, Tag, Input, Tabs, Button, Avatar, Typography, message, Modal } from 'antd';
import { SearchOutlined, UserOutlined, PlusOutlined, CheckOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { mockAgents } from '@/mocks/data';

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
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');
  const [myAgentIds, setMyAgentIds] = useState<Set<number>>(new Set());
  const navigate = useNavigate();

  const agents = mockAgents.filter(a => a.isPublic && a.status === 'published').filter(a => {
    const matchSearch = !search || a.name.includes(search) || a.description.includes(search);
    const matchTab = tab === 'all' || a.category === tab;
    return matchSearch && matchTab;
  });

  const handleTry = (agent: typeof mockAgents[0]) => {
    if (agent.agentType === 'openclaw') {
      navigate('/chat');
    } else {
      Modal.info({
        title: `${agent.name}`,
        content: `该智能体通过${agentTypeTag[agent.agentType]?.label || '外部'}平台提供服务，暂不支持在本页直接对话。请通过对应渠道（飞书/微信等）与其交互。`,
      });
    }
  };

  const handleAddToMine = (agentId: number) => {
    if (myAgentIds.has(agentId)) {
      setMyAgentIds(prev => { const next = new Set(prev); next.delete(agentId); return next; });
      message.info('已从我的智能体移除');
    } else {
      setMyAgentIds(prev => new Set(prev).add(agentId));
      message.success('已加入我的智能体');
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
        {agents.map(agent => {
          const typeInfo = agentTypeTag[agent.agentType] || agentTypeTag.openclaw;
          const isAdded = myAgentIds.has(agent.id);

          return (
            <Card key={agent.id} hoverable style={{ borderRadius: 12 }}>
              {/* Header: avatar + name + tags */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <Avatar size={48} style={{ background: '#f5f5f5', fontSize: 24, flexShrink: 0 }}>{agent.avatar}</Avatar>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 16, fontWeight: 600 }}>{agent.name}</Text>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
                    <Tag color="blue">官方</Tag>
                    <Tag color={typeInfo.color}>{typeInfo.label}</Tag>
                    <Tag>{categoryTabs.find(t => t.key === agent.category)?.label}</Tag>
                  </div>
                </div>
              </div>

              {/* Description */}
              <Paragraph type="secondary" ellipsis={{ rows: 2 }} style={{ minHeight: 44, marginBottom: 12 }}>
                {agent.description}
              </Paragraph>

              {/* Footer: usage + actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  <UserOutlined /> {agent.useCount.toLocaleString()} 使用
                </Text>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button size="small" type="primary" onClick={() => handleTry(agent)}
                    style={{ borderRadius: 6, background: '#1a1a2e', fontSize: 12 }}>
                    试用
                  </Button>
                  <Button size="small" onClick={() => handleAddToMine(agent.id)}
                    type={isAdded ? 'default' : 'dashed'}
                    icon={isAdded ? <CheckOutlined /> : <PlusOutlined />}
                    style={{ borderRadius: 6, fontSize: 12, color: isAdded ? '#52c41a' : undefined,
                      borderColor: isAdded ? '#52c41a' : undefined }}>
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
