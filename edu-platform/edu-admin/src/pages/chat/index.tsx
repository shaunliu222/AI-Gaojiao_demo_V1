import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Input, Button, Avatar, Select, Typography, Space, Tag, Tooltip, Badge } from 'antd';
import { PlusOutlined, SearchOutlined, SendOutlined, PaperClipOutlined, LinkOutlined, StopOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import { aiChatApi, agentApi } from '@/services/request';
import { mockStreamResponse } from '@/mocks/data';

const { Text } = Typography;
const { TextArea } = Input;

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  references?: Array<{ title: string; source: string }>;
}

interface ChatSession {
  id: string | number;
  title: string;
  agentId?: string;
  agentName?: string;
  updatedAt?: string;
  lastMessage?: string;
}

// Agent list loaded from API
const defaultAgent = { name: 'Main Agent', avatar: '🤖', description: 'OpenClaw Gateway 默认智能体，由 OpenClaw 本地配置决定其能力和人设' };

const ChatPage: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<string | number>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState('main');
  const [gatewayStatus, setGatewayStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  const [useBackendProxy, setUseBackendProxy] = useState(true);
  const [agentList, setAgentList] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load agents from API
  useEffect(() => {
    agentApi.publicList().then((res: any) => setAgentList(res.data || [])).catch(() => {});
  }, []);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(scrollToBottom, [messages]);

  // Load sessions from backend
  useEffect(() => {
    const loadSessions = async () => {
      try {
        const res: any = await aiChatApi.sessions();
        const list = (res.data || []).map((s: any) => ({
          id: s.id, title: s.title || '新对话', agentId: s.agentId,
          agentName: s.agentId || 'Main Agent',
          updatedAt: s.updatedAt?.slice(0, 16).replace('T', ' '),
          lastMessage: s.lastMessage,
        }));
        setSessions(list);
      } catch {
        // Backend might not be running, keep empty
      }
    };
    loadSessions();
  }, []);

  // Check Gateway health via backend proxy
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res: any = await aiChatApi.gatewayHealth();
        const ok = res.data === true;
        setGatewayStatus(ok ? 'connected' : 'disconnected');
        setUseBackendProxy(true);
      } catch {
        // Backend not available, try direct gateway
        try {
          const directRes = await fetch('/gateway/healthz', { signal: AbortSignal.timeout(3000) });
          setGatewayStatus(directRes.ok ? 'connected' : 'disconnected');
          setUseBackendProxy(false);
        } catch {
          setGatewayStatus('disconnected');
          setUseBackendProxy(false);
        }
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const selectedAgent: any = agentList.find((a: any) => a.name === selectedAgentId) || defaultAgent;

  const handleSessionClick = (sid: string | number) => {
    setActiveSession(sid);
    setMessages([]);
  };

  const handleNewSession = () => {
    const newId = `local-${Date.now()}`;
    setSessions(prev => [{ id: newId, title: '新对话', agentName: selectedAgent.name, updatedAt: new Date().toLocaleString() }, ...prev]);
    setActiveSession(newId);
    setMessages([]);
  };

  const handleDeleteSession = async (sid: string | number) => {
    if (typeof sid === 'number') {
      try { await aiChatApi.deleteSession(sid); } catch { /* ignore */ }
    }
    setSessions(prev => prev.filter(s => s.id !== sid));
    if (activeSession === sid) { setActiveSession(''); setMessages([]); }
  };

  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isStreaming) return;
    const userMsg: Message = { id: `m${Date.now()}`, role: 'user', content: inputValue, timestamp: new Date().toLocaleTimeString() };
    setMessages(prev => [...prev, userMsg]);
    const sentText = inputValue;
    setInputValue('');
    setIsStreaming(true);

    const assistantMsg: Message = { id: `m${Date.now() + 1}`, role: 'assistant', content: '', timestamp: new Date().toLocaleTimeString() };
    setMessages(prev => [...prev, assistantMsg]);

    const allMessages = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));

    // Try backend proxy first
    if (useBackendProxy) {
      try {
        let content = '';
        await aiChatApi.chatStream(
          { model: 'openclaw', messages: allMessages, agentId: selectedAgentId === 'main' ? undefined : selectedAgentId },
          (chunk) => {
            try {
              const parsed = JSON.parse(chunk);
              const delta = parsed.choices?.[0]?.delta?.content || parsed.data || '';
              content += delta;
              setMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...m, content } : m));
            } catch {
              content += chunk;
              setMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...m, content } : m));
            }
          },
          () => setIsStreaming(false),
          (err) => {
            setMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...m, content: `Error: ${err}` } : m));
            setIsStreaming(false);
          }
        );
        return;
      } catch { /* fall through to direct gateway */ }
    }

    // Try direct OpenClaw Gateway (when backend proxy unavailable but gateway is reachable)
    if (gatewayStatus === 'connected') {
      try {
        const res = await fetch('/gateway/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-openclaw-agent-id': selectedAgentId === 'main' ? '' : selectedAgentId,
          },
          body: JSON.stringify({
            model: selectedAgentId === 'main' ? 'openclaw' : `openclaw/${selectedAgentId}`,
            messages: allMessages,
            stream: true,
          }),
          signal: AbortSignal.timeout(60000),
        });

        if (res.ok && res.body) {
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let content = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(l => l.startsWith('data: ') || l.startsWith('data:'));
            for (const line of lines) {
              const data = line.replace(/^data:\s?/, '');
              if (data === '[DONE]') continue;
              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta?.content || '';
                content += delta;
                setMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...m, content } : m));
              } catch { /* skip malformed chunks */ }
            }
          }
          setIsStreaming(false);
          return;
        }
      } catch { /* fall through to mock */ }
    }

    // Mock fallback
    const stream = mockStreamResponse(sentText);
    const reader = stream.getReader();
    let content = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      content += value;
      setMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...m, content } : m));
    }
    setIsStreaming(false);
  }, [inputValue, isStreaming, selectedAgentId, messages, useBackendProxy]);

  const filteredSessions = sessions.filter(s => !searchText || (s.title || '').includes(searchText));
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
          {filteredSessions.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: '#999', fontSize: 13 }}>暂无对话记录</div>}
        </div>
      </div>

      {/* Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Top Bar */}
        <div style={{ padding: '10px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Select value={selectedAgentId} onChange={setSelectedAgentId} style={{ width: 260 }} variant="borderless"
            popupMatchSelectWidth={320} optionLabelProp="label"
            options={[
              { label: <span style={{ fontWeight: 600, fontSize: 12, color: '#999' }}>--- 公共 Agent ---</span>, options:
                [{ label: '🤖 Main Agent (默认)', value: 'main' },
                ...agentList.map((a: any) => ({ label: `${a.avatar || '🤖'} ${a.name}`, value: a.name }))],
              },
              { label: <span style={{ fontWeight: 600, fontSize: 12, color: '#999' }}>--- 我的 Agent ---</span>, options:
                [],
              },
            ]}
          />
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Badge status={gatewayStatus === 'connected' ? 'success' : gatewayStatus === 'checking' ? 'processing' : 'error'} />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {gatewayStatus === 'connected'
                ? (useBackendProxy ? '后端代理已连接' : 'Gateway 直连')
                : gatewayStatus === 'checking' ? '检查中...' : 'Mock 模式'}
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

        {/* Quick Prompts */}
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
