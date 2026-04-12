import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Input, Button, Avatar, Select, Typography, Space, Tag, Tooltip, Empty, Badge } from 'antd';
import { PlusOutlined, SearchOutlined, SendOutlined, PaperClipOutlined, LinkOutlined, StopOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import { mockSessions, mockMessages, mockAgents, mockStreamResponse } from '@/mocks/data';

const { Text } = Typography;
const { TextArea } = Input;

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  references?: Array<{ title: string; source: string }>;
}

// Only show OpenClaw agents
const openclawAgents = mockAgents.filter(a => a.agentType === 'openclaw');
const publicAgents = openclawAgents.filter(a => a.isPublic && a.status === 'published');
const myAgents = openclawAgents.filter(a => !a.isPublic || a.owner === 'teacher');

// Use Vite proxy to avoid CORS: /gateway/* → localhost:18789/*
const GATEWAY_URL = '/gateway';
const GATEWAY_TOKEN = '55dcc5b9e1a204de527c74b6c65232c7a72f516f00fc66c1'; // TODO: move to env/backend config

const ChatPage: React.FC = () => {
  const [sessions, setSessions] = useState(mockSessions);
  const [activeSession, setActiveSession] = useState<string>('s1');
  const [messages, setMessages] = useState<Message[]>(mockMessages['s1'] || []);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState('main');
  const [gatewayStatus, setGatewayStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(scrollToBottom, [messages]);

  // Check Gateway health
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch(`${GATEWAY_URL}/healthz`, {
          signal: AbortSignal.timeout(3000),
          headers: { 'Authorization': `Bearer ${GATEWAY_TOKEN}` },
        });
        setGatewayStatus(res.ok ? 'connected' : 'disconnected');
      } catch {
        setGatewayStatus('disconnected');
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const selectedAgent = openclawAgents.find(a => a.name === selectedAgentId) ||
    { name: 'Main Agent', avatar: '🤖', description: '与 AI 互动，探索无限创意' };

  const handleSessionClick = (sid: string) => {
    setActiveSession(sid);
    setMessages(mockMessages[sid] || []);
  };

  const handleNewSession = () => {
    const newId = `s${Date.now()}`;
    setSessions([{ id: newId, title: '新对话', agentId: 1, agentName: selectedAgent.name, updatedAt: new Date().toLocaleString(), messageCount: 0 }, ...sessions]);
    setActiveSession(newId);
    setMessages([]);
  };

  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isStreaming) return;
    const userMsg: Message = { id: `m${Date.now()}`, role: 'user', content: inputValue, timestamp: new Date().toLocaleTimeString() };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsStreaming(true);

    const assistantMsg: Message = { id: `m${Date.now() + 1}`, role: 'assistant', content: '', timestamp: new Date().toLocaleTimeString() };
    setMessages(prev => [...prev, assistantMsg]);

    // Try real OpenClaw Gateway first, fall back to mock
    try {
      const res = await fetch(`${GATEWAY_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GATEWAY_TOKEN}`,
          'x-openclaw-agent-id': selectedAgentId === 'main' ? '' : selectedAgentId,
        },
        body: JSON.stringify({
          model: selectedAgentId === 'main' ? 'openclaw' : `openclaw/${selectedAgentId}`,
          messages: [{ role: 'user', content: inputValue }],
          stream: true,
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';

        if (contentType.includes('text/event-stream') && res.body) {
          // SSE streaming response
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let content = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
            for (const line of lines) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta?.content || '';
                content += delta;
                setMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...m, content } : m));
              } catch { /* skip malformed SSE chunks */ }
            }
          }
        } else {
          // Non-streaming JSON response
          const data = await res.json();
          const content = data.choices?.[0]?.message?.content || 'No response';
          setMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...m, content } : m));
        }
        setIsStreaming(false);
        return;
      }
    } catch {
      // Gateway not available, use mock
    }

    // Mock fallback
    const stream = mockStreamResponse(inputValue);
    const reader = stream.getReader();
    let content = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      content += value;
      setMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...m, content } : m));
    }
    setMessages(prev => prev.map(m => m.id === assistantMsg.id ? {
      ...m, content,
      references: [{ title: '知识库检索结果', source: '课程知识图谱' }],
    } : m));
    setIsStreaming(false);
  }, [inputValue, isStreaming, selectedAgentId]);

  const filteredSessions = sessions.filter(s => s.title.includes(searchText));
  const isNewChat = messages.length === 0;
  const quickPrompts = ['这门课程的核心知识点有哪些？', '帮我梳理一下学习路径', '解释一下机器学习中的梯度下降', '推荐一些相关的学习资源'];

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 112px)', margin: -24, borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
      {/* Session Panel */}
      <div style={{ width: 280, borderRight: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column', background: '#fafafa' }}>
        <div style={{ padding: 16 }}>
          <Button type="primary" icon={<PlusOutlined />} block onClick={handleNewSession}
            style={{ background: 'linear-gradient(135deg, #1a1a2e, #16213e)', borderRadius: 8, height: 40 }}>
            新建对话
          </Button>
        </div>
        <div style={{ padding: '0 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text type="secondary" style={{ fontSize: 13 }}>历史对话</Text>
          <SearchOutlined style={{ color: '#999', cursor: 'pointer' }} />
        </div>
        <Input placeholder="搜索对话..." value={searchText} onChange={e => setSearchText(e.target.value)}
          size="small" prefix={<SearchOutlined />} style={{ margin: '0 16px 8px', width: 'calc(100% - 32px)' }} allowClear />
        <div style={{ flex: 1, overflow: 'auto' }}>
          {filteredSessions.map(item => (
            <div key={item.id} onClick={() => handleSessionClick(item.id)} style={{
              padding: '10px 16px', cursor: 'pointer',
              background: item.id === activeSession ? '#e8e8f0' : 'transparent',
              borderLeft: item.id === activeSession ? '3px solid #1a1a2e' : '3px solid transparent',
              transition: 'all 0.15s',
            }}>
              <Text style={{ fontSize: 13 }} ellipsis>{item.title}</Text>
              <div><Text type="secondary" style={{ fontSize: 11 }}>{item.agentName} · {item.updatedAt}</Text></div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Top Bar - Agent Selector Only (no model selector) */}
        <div style={{ padding: '10px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Select value={selectedAgentId} onChange={setSelectedAgentId} style={{ width: 260 }} variant="borderless"
            popupMatchSelectWidth={320} optionLabelProp="label"
            options={[
              { label: <span style={{ fontWeight: 600, fontSize: 12, color: '#999' }}>--- 公共 Agent ---</span>, options:
                [{ label: '🤖 Main Agent (默认)', value: 'main' },
                ...publicAgents.map(a => ({ label: `${a.avatar} ${a.name}`, value: a.name }))],
              },
              { label: <span style={{ fontWeight: 600, fontSize: 12, color: '#999' }}>--- 我的 Agent ---</span>, options:
                myAgents.map(a => ({ label: `${a.avatar} ${a.name}`, value: a.name })),
              },
            ]}
          />
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Badge status={gatewayStatus === 'connected' ? 'success' : gatewayStatus === 'checking' ? 'processing' : 'error'} />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {gatewayStatus === 'connected' ? 'Gateway 已连接' : gatewayStatus === 'checking' ? '检查中...' : 'Gateway 未连接 (Mock 模式)'}
            </Text>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px 40px' }}>
          {isNewChat ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16 }}>
              <Avatar size={80} style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', fontSize: 32 }}>
                {selectedAgent.avatar || 'AI'}
              </Avatar>
              <Text style={{ fontSize: 24, fontWeight: 600 }}>{selectedAgent.name}</Text>
              <Text type="secondary">{selectedAgent.description}</Text>
            </div>
          ) : (
            messages.map(msg => (
              <div key={msg.id} style={{ display: 'flex', marginBottom: 20, justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                {msg.role === 'assistant' && <Avatar style={{ marginRight: 12, background: 'linear-gradient(135deg, #667eea, #764ba2)', flexShrink: 0 }}>AI</Avatar>}
                <div style={{ maxWidth: '70%' }}>
                  <div style={{ padding: '12px 16px', borderRadius: 12, background: msg.role === 'user' ? '#1a1a2e' : '#f5f5f5', color: msg.role === 'user' ? '#fff' : '#333' }}>
                    {msg.role === 'assistant'
                      ? <div className="markdown-body"><ReactMarkdown>{msg.content || '...'}</ReactMarkdown></div>
                      : <span>{msg.content}</span>}
                  </div>
                  {msg.references && msg.references.length > 0 && (
                    <div style={{ marginTop: 6 }}>
                      {msg.references.map((ref, i) => (
                        <Tag key={i} color="blue" style={{ cursor: 'pointer', borderRadius: 4, fontSize: 11 }}>
                          📎 {ref.title} — {ref.source}
                        </Tag>
                      ))}
                    </div>
                  )}
                </div>
                {msg.role === 'user' && <Avatar style={{ marginLeft: 12, flexShrink: 0, background: '#1a1a2e' }}>U</Avatar>}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts (new chat only) */}
        {isNewChat && (
          <div style={{ padding: '0 40px 8px', textAlign: 'center' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>猜你想问</Text>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 8 }}>
              {quickPrompts.map((p, i) => (
                <Button key={i} size="small" style={{ borderRadius: 16, fontSize: 12 }} onClick={() => setInputValue(p)}>{p}</Button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div style={{ padding: '12px 40px 16px', borderTop: '1px solid #f0f0f0' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, background: '#f9f9f9', borderRadius: 12, padding: '10px 14px', border: '1px solid #e8e8e8' }}>
            <Tooltip title="上传文件"><Button type="text" icon={<PaperClipOutlined />} size="small" /></Tooltip>
            <Tooltip title="引用知识库"><Button type="text" icon={<LinkOutlined />} size="small" /></Tooltip>
            <TextArea autoSize={{ minRows: 1, maxRows: 4 }} placeholder="输入消息..." value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onPressEnter={e => { if (!e.shiftKey) { e.preventDefault(); handleSend(); } }}
              variant="borderless" style={{ flex: 1, background: 'transparent', resize: 'none' }} />
            {isStreaming ? (
              <Button shape="circle" icon={<StopOutlined />} danger onClick={() => setIsStreaming(false)} />
            ) : (
              <Button type="primary" shape="circle" icon={<SendOutlined />} onClick={handleSend}
                disabled={!inputValue.trim()} style={{ background: inputValue.trim() ? '#1a1a2e' : '#d9d9d9' }} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
