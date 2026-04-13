import React, { useState, useEffect, useCallback } from 'react';
import { Card, Tag, Button, Space, Input, Drawer, Typography, List, Steps, Upload, message, Tabs, Modal, Form, Spin, Empty } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, UploadOutlined, InboxOutlined, SendOutlined, DeleteOutlined } from '@ant-design/icons';
import { knowledgeApi } from '@/services/request';

const { Text, Paragraph } = Typography;
const { Dragger } = Upload;
const { TextArea } = Input;

const nodeTypeColors: Record<string, string> = {
  chapter: '#52c41a', section: '#1890ff', concept: '#eb2f96',
  formula: '#fa8c16', method: '#722ed1', job: '#13c2c2', competency: '#faad14', course: '#2f54eb',
};

const KnowledgeGraphPage: React.FC = () => {
  const [graphs, setGraphs] = useState<any[]>([]);
  const [selectedGraphId, setSelectedGraphId] = useState<number | null>(null);
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [buildOpen, setBuildOpen] = useState(false);
  const [queryOpen, setQueryOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [graphTab, setGraphTab] = useState('public');
  const [search, setSearch] = useState('');

  // Build flow state
  const [buildStep, setBuildStep] = useState(0);
  const [buildText, setBuildText] = useState('');
  const [buildTaskId, setBuildTaskId] = useState<number | null>(null);
  const [buildResult, setBuildResult] = useState<any>(null);
  const [buildLoading, setBuildLoading] = useState(false);

  // Query state
  const [queryText, setQueryText] = useState('');
  const [queryResult, setQueryResult] = useState<any>(null);
  const [queryLoading, setQueryLoading] = useState(false);

  const [createForm] = Form.useForm();

  const loadGraphs = useCallback(() => {
    knowledgeApi.listGraphs().then((res: any) => {
      const list = res.data || [];
      setGraphs(list);
      if (!selectedGraphId && list.length > 0) setSelectedGraphId(list[0].id);
    }).catch(() => {});
  }, [selectedGraphId]);

  useEffect(() => { loadGraphs(); }, []);

  const loadGraphData = useCallback(() => {
    if (!selectedGraphId) return;
    knowledgeApi.graphData(selectedGraphId).then((res: any) => {
      setNodes(res.data?.nodes || []);
      setEdges(res.data?.edges || []);
    }).catch(() => {});
  }, [selectedGraphId]);

  useEffect(() => { loadGraphData(); }, [loadGraphData]);

  const currentGraph = graphs.find(g => g.id === selectedGraphId);

  // --- Graph CRUD ---
  const handleCreateGraph = async () => {
    try {
      const values = await createForm.validateFields();
      values.isPublic = values.isPublic === true || values.isPublic === 'true';
      await knowledgeApi.createGraph(values);
      message.success('图谱创建成功');
      setCreateOpen(false);
      createForm.resetFields();
      loadGraphs();
    } catch { message.error('创建失败'); }
  };

  // --- Node click → show attachments ---
  const handleNodeClick = async (node: any) => {
    setSelectedNode(node);
    setDrawerOpen(true);
    try {
      const res: any = await knowledgeApi.attachments(selectedGraphId!, node.id);
      setAttachments(res.data || []);
    } catch { setAttachments([]); }
  };

  // --- Five-step build ---
  const handleStartBuild = async () => {
    if (!buildText.trim()) { message.warning('请输入或粘贴文档内容'); return; }
    setBuildLoading(true);
    setBuildStep(1);
    try {
      const res: any = await knowledgeApi.triggerBuild(selectedGraphId!, buildText);
      setBuildTaskId(res.data?.id);
      message.success('已提交 LLM 抽取任务');
      // Poll for completion
      const poll = setInterval(async () => {
        try {
          const taskRes: any = await knowledgeApi.getBuildTask(selectedGraphId!, res.data.id);
          const task = taskRes.data;
          if (task?.status === 'extracted') {
            clearInterval(poll);
            setBuildResult(task.result);
            setBuildStep(2);
            setBuildLoading(false);
            message.success('LLM 抽取完成，请审核结果');
          } else if (task?.status === 'failed') {
            clearInterval(poll);
            setBuildLoading(false);
            message.error('抽取失败: ' + (task.errorMessage || '未知错误'));
          }
        } catch { clearInterval(poll); setBuildLoading(false); }
      }, 2000);
    } catch { setBuildLoading(false); message.error('提交失败'); }
  };

  const handleApprove = async () => {
    if (!buildTaskId || !buildResult) return;
    setBuildLoading(true);
    try {
      // Parse LLM extraction result to get entities and relations
      let entities: any[] = [];
      let relations: any[] = [];
      try {
        // buildResult.raw_response is an OpenAI chat completion JSON string
        const rawResponse = buildResult.raw_response || buildResult;
        let content = rawResponse;
        // If it's a chat completion object, extract the message content
        if (typeof rawResponse === 'string' && rawResponse.includes('"choices"')) {
          const parsed = JSON.parse(rawResponse);
          content = parsed.choices?.[0]?.message?.content || rawResponse;
        }
        // Extract JSON from markdown code block if wrapped in ```json ... ```
        const jsonMatch = content.match(/```json\s*([\s\S]*?)```/);
        const jsonStr = jsonMatch ? jsonMatch[1] : content;
        const extracted = JSON.parse(jsonStr);
        entities = extracted.entities || [];
        relations = extracted.relations || [];
      } catch (e) {
        console.warn('Failed to parse extraction result, trying text split', e);
      }

      // Convert entities to KgNode format
      const nodes = entities.map((e: any) => ({
        name: e.name,
        nodeType: e.type || 'concept',
        description: e.description || '',
      }));

      // We need node IDs for edges, but they'll be assigned by backend
      // So we pass relations as-is and let backend handle name-based matching
      // For now, create nodes first, then create edges separately

      // Step 1: Create nodes via skeleton API
      await knowledgeApi.createSkeleton(selectedGraphId!, { nodes, edges: [] });

      // Step 2: After nodes are created, reload and create edges by matching names
      if (relations.length > 0) {
        const graphDataRes: any = await knowledgeApi.graphData(selectedGraphId!);
        const createdNodes = graphDataRes.data?.nodes || [];
        for (const rel of relations) {
          const sourceNode = createdNodes.find((n: any) => n.name === rel.source);
          const targetNode = createdNodes.find((n: any) => n.name === rel.target);
          if (sourceNode && targetNode) {
            try {
              await knowledgeApi.addEdge(selectedGraphId!, {
                sourceNodeId: sourceNode.id,
                targetNodeId: targetNode.id,
                edgeType: rel.type || 'RELATES_TO',
              });
            } catch { /* skip failed edges */ }
          }
        }
      }

      setBuildStep(3);
      message.success(`已添加 ${nodes.length} 个节点和 ${relations.length} 个关系到图谱`);
      loadGraphData();
    } catch (err) {
      console.error('Approve failed', err);
      message.error('批准失败');
    }
    setBuildLoading(false);
  };

  // --- Knowledge Query ---
  const handleQuery = async () => {
    if (!queryText.trim()) return;
    setQueryLoading(true);
    try {
      const res: any = await knowledgeApi.query(selectedGraphId!, queryText);
      setQueryResult(res.data);
    } catch { message.error('检索失败'); }
    setQueryLoading(false);
  };

  // --- Render graph nodes with auto-layout ---
  const layoutNodes = nodes.map((node, i) => {
    const cols = Math.ceil(Math.sqrt(nodes.length));
    const row = Math.floor(i / cols);
    const col = i % cols;
    return { ...node, x: 60 + col * 140, y: 40 + row * 120 };
  });

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 112px)', margin: -24, overflow: 'hidden' }}>
      {/* Left panel - graph list */}
      <div style={{ width: 260, borderRight: '1px solid #f0f0f0', padding: 16, overflow: 'auto', background: '#fafafa' }}>
        <Tabs activeKey={graphTab} onChange={setGraphTab} size="small" items={[
          { key: 'public', label: '公共图谱' }, { key: 'mine', label: '我的图谱' },
        ]} />
        <Input placeholder="搜索图谱..." prefix={<SearchOutlined />} size="small" value={search} onChange={e => setSearch(e.target.value)} style={{ marginBottom: 12 }} />
        <Button type="dashed" icon={<PlusOutlined />} block size="small" style={{ marginBottom: 12 }} onClick={() => setCreateOpen(true)}>创建图谱</Button>
        <List dataSource={graphTab === 'public' ? graphs.filter(g => g.isPublic) : graphs} renderItem={item => (
          <Card size="small" hoverable onClick={() => setSelectedGraphId(item.id)}
            style={{ marginBottom: 8, borderRadius: 8, borderLeft: `3px solid ${item.id === selectedGraphId ? '#1890ff' : '#d9d9d9'}`, background: item.id === selectedGraphId ? '#e6f7ff' : '#fff' }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{item.name}</div>
            <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>{item.nodeCount || 0} 节点 · {item.edgeCount || 0} 关系</div>
          </Card>
        )} />
      </div>

      {/* Center - graph visualization */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Text strong>{currentGraph?.name || '选择图谱'}</Text>
            <Tag>{nodes.length} 节点</Tag><Tag>{edges.length} 关系</Tag>
          </Space>
          <Space>
            <Button size="small" icon={<SearchOutlined />} onClick={() => setQueryOpen(true)} type="primary" style={{ background: '#1a1a2e' }}>图谱检索问答</Button>
            <Button size="small" icon={<UploadOutlined />} onClick={() => { setBuildOpen(true); setBuildStep(0); setBuildText(''); setBuildResult(null); }}>上传资料构建</Button>
          </Space>
        </div>

        {/* Graph canvas */}
        <div style={{ flex: 1, position: 'relative', overflow: 'auto', background: '#fafbfc' }}>
          {nodes.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <Empty description="暂无节点，点击「上传资料构建」开始" />
            </div>
          ) : (<>
            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
              {edges.map((edge, i) => {
                const s = layoutNodes.find(n => n.id === edge.sourceNodeId);
                const t = layoutNodes.find(n => n.id === edge.targetNodeId);
                if (!s || !t) return null;
                return <line key={i} x1={s.x + 40} y1={s.y + 40} x2={t.x + 40} y2={t.y + 40} stroke="#d9d9d9" strokeWidth={1.5} />;
              })}
            </svg>
            {layoutNodes.map(node => (
              <div key={node.id} onClick={() => handleNodeClick(node)} style={{
                position: 'absolute', left: node.x, top: node.y,
                minWidth: 80, padding: '8px 12px', borderRadius: 8,
                border: `2px solid ${nodeTypeColors[node.nodeType] || '#999'}`, background: '#fff',
                fontSize: 12, textAlign: 'center', cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)', zIndex: 1, maxWidth: 120,
              }}>
                <div style={{ fontWeight: 600, fontSize: 11, marginBottom: 2 }}>{node.name}</div>
                <Tag color={nodeTypeColors[node.nodeType]} style={{ fontSize: 10 }}>{node.nodeType}</Tag>
              </div>
            ))}
          </>)}
        </div>
      </div>

      {/* Node detail drawer */}
      <Drawer title={selectedNode?.name || '节点详情'} open={drawerOpen} onClose={() => setDrawerOpen(false)} width={400}>
        {selectedNode && (<>
          <div style={{ marginBottom: 16 }}>
            <Tag color={nodeTypeColors[selectedNode.nodeType]}>{selectedNode.nodeType}</Tag>
            <Text type="secondary">ID: {selectedNode.id}</Text>
          </div>
          <Paragraph>{selectedNode.description || '暂无描述'}</Paragraph>
          <div style={{ marginTop: 16 }}>
            <Text strong>挂载的知识片段 ({attachments.length})</Text>
            {attachments.length === 0 ? <Empty description="暂无知识片段" style={{ marginTop: 12 }} /> : (
              <List size="small" style={{ marginTop: 8 }} dataSource={attachments} renderItem={(item: any) => (
                <List.Item><Paragraph style={{ fontSize: 13, margin: 0 }} ellipsis={{ rows: 3 }}>{item.contentSnippet}</Paragraph></List.Item>
              )} />
            )}
          </div>
          <div style={{ marginTop: 16 }}>
            <Text strong>手动挂载知识</Text>
            <TextArea rows={3} placeholder="输入知识片段内容..." style={{ marginTop: 8 }} id="attachInput" />
            <Button type="primary" size="small" style={{ marginTop: 8, background: '#1a1a2e' }} onClick={async () => {
              const input = (document.getElementById('attachInput') as HTMLTextAreaElement)?.value;
              if (!input?.trim()) return;
              try {
                await knowledgeApi.attach(selectedGraphId!, { nodeId: selectedNode.id, content: input });
                message.success('已挂载');
                const res: any = await knowledgeApi.attachments(selectedGraphId!, selectedNode.id);
                setAttachments(res.data || []);
              } catch { message.error('挂载失败'); }
            }}>挂载到此节点</Button>
          </div>
        </>)}
      </Drawer>

      {/* Five-step build drawer */}
      <Drawer title="五步构建图谱" open={buildOpen} onClose={() => setBuildOpen(false)} width={600}>
        <Steps current={buildStep} size="small" style={{ marginBottom: 24 }} items={[
          { title: '① 骨架' },
          { title: '② 抽取' },
          { title: '③ 审核' },
          { title: '④ 挂载' },
          { title: '⑤ 完成' },
        ]} />

        {/* Step 0: 骨架定义 — 手动 OR LLM辅助 */}
        {buildStep === 0 && (<>
          <div style={{ background: '#f6f8fa', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
            <b>Step 1: 创建图谱骨架</b> — 定义知识结构（章→节→知识点），或上传资料让 LLM 辅助提取框架。
          </div>
          <Tabs items={[
            { key: 'llm', label: 'LLM 辅助提取', children: (<>
              <TextArea rows={8} value={buildText} onChange={e => setBuildText(e.target.value)}
                placeholder="粘贴教材目录或核心内容，LLM 自动提取知识骨架..." />
              <Dragger beforeUpload={(file) => { const r = new FileReader(); r.onload = (e) => { setBuildText(e.target?.result as string || ''); message.success('已加载'); }; r.readAsText(file); return false; }} showUploadList={false} style={{ marginTop: 8 }}>
                <p style={{ margin: 0, fontSize: 13 }}><InboxOutlined /> 拖拽 .txt/.md 文件</p>
              </Dragger>
              <Button type="primary" block style={{ marginTop: 12, background: '#1a1a2e' }} loading={buildLoading} onClick={handleStartBuild}>
                LLM 提取骨架并抽取实体
              </Button>
            </>) },
            { key: 'skip', label: '跳过（已有骨架）', children: (
              <Button block onClick={() => setBuildStep(3)}>图谱已有节点，直接进入 Step 4 挂载知识</Button>
            ) },
          ]} />
        </>)}

        {/* Step 1: LLM 抽取中 */}
        {buildStep === 1 && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin size="large" />
            <Paragraph style={{ marginTop: 16 }}>LLM 正在分析文本，抽取知识实体和关系...</Paragraph>
            <Paragraph type="secondary">这可能需要 1-3 分钟，请耐心等待</Paragraph>
          </div>
        )}

        {/* Step 2: 审核确认 */}
        {buildStep === 2 && (<>
          <div style={{ background: '#f6f8fa', padding: 12, borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
            <b>Step 3: 人工审核</b> — 查看 LLM 抽取结果，确认后添加到图谱。
          </div>
          <div style={{ background: '#fff', padding: 12, borderRadius: 8, maxHeight: 350, overflow: 'auto', fontSize: 13, whiteSpace: 'pre-wrap', border: '1px solid #e8e8e8' }}>
            {typeof buildResult === 'string' ? buildResult :
             buildResult?.raw_response ? String(buildResult.raw_response) :
             JSON.stringify(buildResult, null, 2)}
          </div>
          <Space style={{ marginTop: 16 }}>
            <Button type="primary" style={{ background: '#52c41a' }} onClick={handleApprove} loading={buildLoading}>批准并添加到图谱</Button>
            <Button onClick={() => { setBuildStep(0); setBuildResult(null); }}>重新抽取</Button>
          </Space>
        </>)}

        {/* Step 3: 持续挂载 — LLM 自动切片 */}
        {buildStep === 3 && (<>
          <div style={{ background: '#f0f5ff', padding: 12, borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
            <b>Step 4: 持续挂载</b> — 上传新资料，LLM 根据图谱节点自动切片并关联到对应知识点。
          </div>
          <TextArea rows={8} value={buildText} onChange={e => setBuildText(e.target.value)}
            placeholder="粘贴新的学习资料/教材内容...&#10;LLM 会自动将内容切分为知识片段，匹配到图谱中最相关的节点。" />
          <Dragger beforeUpload={(file) => { const r = new FileReader(); r.onload = (e) => { setBuildText(e.target?.result as string || ''); message.success('已加载'); }; r.readAsText(file); return false; }} showUploadList={false} style={{ marginTop: 8 }}>
            <p style={{ margin: 0, fontSize: 13 }}><InboxOutlined /> 拖拽 .txt/.md 文件</p>
          </Dragger>
          <Space style={{ marginTop: 12 }}>
            <Button type="primary" style={{ background: '#1a1a2e' }} loading={buildLoading} onClick={async () => {
              if (!buildText.trim()) { message.warning('请输入资料内容'); return; }
              setBuildLoading(true);
              try {
                const res: any = await knowledgeApi.autoAttach(selectedGraphId!, buildText);
                const data = res.data;
                if (data?.error) { message.error(data.error); }
                else { message.success(`已挂载 ${data?.attached || 0} 个知识片段到图谱节点`); }
                setBuildStep(4);
                loadGraphData();
              } catch { message.error('自动挂载失败'); }
              setBuildLoading(false);
            }}>LLM 自动切片并挂载</Button>
            <Button onClick={() => setBuildStep(4)}>跳过，直接完成</Button>
          </Space>
        </>)}

        {/* Step 4: 完成 */}
        {buildStep === 4 && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 48 }}>✅</div>
            <Paragraph strong style={{ fontSize: 16, marginTop: 16 }}>构建完成</Paragraph>
            <Paragraph type="secondary">图谱节点已更新，知识片段已挂载。可用于检索问答。</Paragraph>
            <Space>
              <Button type="primary" onClick={() => { setBuildOpen(false); loadGraphData(); }} style={{ background: '#1a1a2e' }}>查看图谱</Button>
              <Button onClick={() => { setBuildStep(3); setBuildText(''); }}>继续挂载更多资料</Button>
            </Space>
          </div>
        )}
      </Drawer>

      {/* Knowledge Query drawer */}
      <Drawer title="图谱检索问答" open={queryOpen} onClose={() => { setQueryOpen(false); setQueryResult(null); }} width={520}>
        <Paragraph type="secondary">基于知识图谱结构检索 + 挂载知识片段 → LLM 生成有据可查的回答</Paragraph>
        <Space.Compact style={{ width: '100%', marginBottom: 16 }}>
          <Input placeholder="输入问题..." value={queryText} onChange={e => setQueryText(e.target.value)}
            onPressEnter={handleQuery} style={{ flex: 1 }} />
          <Button type="primary" icon={<SendOutlined />} onClick={handleQuery} loading={queryLoading} style={{ background: '#1a1a2e' }}>检索</Button>
        </Space.Compact>

        {queryResult && (<>
          <Card size="small" style={{ marginBottom: 12, background: '#f6f8fa' }}>
            <Text strong>匹配节点：</Text> {(queryResult.matchedNodes || []).map((n: string, i: number) => <Tag key={i} color="blue">{n}</Tag>)}
            <br /><Text strong>知识片段：</Text> {queryResult.snippetCount || 0} 条
          </Card>
          <Card size="small" title="AI 回答">
            <Paragraph style={{ whiteSpace: 'pre-wrap' }}>{queryResult.answer}</Paragraph>
          </Card>
          {queryResult.snippets?.length > 0 && (
            <Card size="small" title="参考知识片段" style={{ marginTop: 12 }}>
              <List size="small" dataSource={queryResult.snippets} renderItem={(s: string, i: number) => (
                <List.Item><Text style={{ fontSize: 12 }}>📎 片段{i + 1}: {s}</Text></List.Item>
              )} />
            </Card>
          )}
        </>)}
      </Drawer>

      {/* Create graph modal */}
      <Modal title="创建知识图谱" open={createOpen} onCancel={() => setCreateOpen(false)} onOk={handleCreateGraph} okButtonProps={{ style: { background: '#1a1a2e' } }}>
        <Form form={createForm} layout="vertical">
          <Form.Item name="name" label="图谱名称" rules={[{ required: true }]}><Input placeholder="如：计算机科学基础" /></Form.Item>
          <Form.Item name="description" label="描述"><Input placeholder="图谱内容描述" /></Form.Item>
          <Form.Item name="isPublic" label="可见性" initialValue={false}>
            <select style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d9d9d9' }}>
              <option value="false">🔒 私有 — 仅自己可见</option>
              <option value="true">🌐 公共 — 全校可见</option>
            </select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default KnowledgeGraphPage;
