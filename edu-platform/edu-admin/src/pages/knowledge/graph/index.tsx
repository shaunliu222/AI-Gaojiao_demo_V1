import React, { useState, useEffect } from 'react';
import { Card, Tag, Button, Space, Input, Select, Drawer, Typography, List, Steps, Upload, message, Tabs } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, UploadOutlined, ApartmentOutlined, InboxOutlined } from '@ant-design/icons';
import { knowledgeApi } from '@/services/request';

const { Text, Paragraph } = Typography;
const { Dragger } = Upload;

const nodeTypeColors: Record<string, { color: string; label: string }> = {
  major: { color: '#52c41a', label: '专业' },
  position: { color: '#fa8c16', label: '岗位' },
  skill: { color: '#1890ff', label: '技能点' },
  knowledge: { color: '#eb2f96', label: '知识点' },
};

const KnowledgeGraphPage: React.FC = () => {
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [buildOpen, setBuildOpen] = useState(false);
  const [graphTab, setGraphTab] = useState('public');
  const [graphs, setGraphs] = useState<any[]>([]);
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [selectedGraphId, setSelectedGraphId] = useState<number | null>(null);

  useEffect(() => {
    knowledgeApi.listGraphs().then((res: any) => {
      const list = res.data || [];
      setGraphs(list);
      if (list.length > 0) setSelectedGraphId(list[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedGraphId) {
      knowledgeApi.graphData(selectedGraphId).then((res: any) => {
        setNodes(res.data?.nodes || []);
        setEdges(res.data?.edges || []);
      }).catch(() => {});
    }
  }, [selectedGraphId]);
  const [search, setSearch] = useState('');

  const handleNodeClick = (node: any) => {
    setSelectedNode(node);
    setDrawerOpen(true);
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 112px)', margin: -24, overflow: 'hidden' }}>
      {/* Left panel - graph list */}
      <div style={{ width: 260, borderRight: '1px solid #f0f0f0', padding: 16, overflow: 'auto', background: '#fafafa' }}>
        <Tabs activeKey={graphTab} onChange={setGraphTab} size="small" items={[
          { key: 'public', label: '公共图谱' }, { key: 'mine', label: '我的图谱' },
        ]} />
        <Input placeholder="搜索图谱..." prefix={<SearchOutlined />} size="small" value={search} onChange={e => setSearch(e.target.value)} style={{ marginBottom: 12 }} />
        <Button type="dashed" icon={<PlusOutlined />} block size="small" style={{ marginBottom: 12 }}>创建图谱</Button>
        <List dataSource={graphs.filter(g => graphTab === 'public' ? g.isPublic : !g.isPublic)} renderItem={item => (
          <Card size="small" hoverable style={{ marginBottom: 8, borderRadius: 8, borderLeft: `3px solid ${item.status === 'building' ? '#faad14' : '#52c41a'}` }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{item.name}</div>
            <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
              {item.nodeCount} 节点 · {item.edgeCount} 关系
              {item.status === 'building' && <Tag color="orange" style={{ marginLeft: 8 }}>构建中</Tag>}
            </div>
          </Card>
        )} />
      </div>

      {/* Center - graph visualization */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Toolbar */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Text strong>数字媒体技术专业图谱</Text>
            <Tag>专业(1)</Tag><Tag>岗位(8)</Tag><Tag>技能点(42)</Tag><Tag>知识点(72)</Tag>
          </Space>
          <Space>
            <Button size="small" icon={<UploadOutlined />} onClick={() => setBuildOpen(true)}>上传资料构建</Button>
            <Button size="small" icon={<EditOutlined />}>编辑图谱</Button>
          </Space>
        </div>

        {/* Graph area - course tabs */}
        <div style={{ padding: '8px 20px', borderBottom: '1px solid #f5f5f5' }}>
          <Space size={4}>
            {['影视后期制作', '渲染', '3D建模', '算法工程', '交互设计工作室'].map(c => (
              <Tag key={c} style={{ cursor: 'pointer', borderRadius: 4 }}>{c}</Tag>
            ))}
          </Space>
        </div>

        {/* Graph canvas placeholder with CSS nodes */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#fafbfc' }}>
          {nodes.map(node => (
            <div key={node.id} onClick={() => handleNodeClick(node)} style={{
              position: 'absolute', left: node.x, top: node.y,
              width: 80, height: 80, borderRadius: '50%',
              border: `3px solid ${node.color}`, background: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, textAlign: 'center', padding: 4, cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)', transition: 'transform 0.2s',
              zIndex: 1,
            }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
              {node.label}
            </div>
          ))}
          {/* SVG edges */}
          <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
            {edges.map((edge, i) => {
              const s = nodes.find(n => n.id === edge.sourceNodeId);
              const t = nodes.find(n => n.id === edge.targetNodeId);
              if (!s || !t) return null;
              return <line key={i} x1={s.x + 40} y1={s.y + 40} x2={t.x + 40} y2={t.y + 40} stroke="#d9d9d9" strokeWidth={1.5} />;
            })}
          </svg>
          {/* Legend */}
          <div style={{ position: 'absolute', bottom: 16, left: 16, display: 'flex', gap: 12, background: '#fff', padding: '8px 12px', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            {Object.entries(nodeTypeColors).map(([key, { color, label }]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Node detail drawer */}
      <Drawer title={selectedNode?.label || '节点详情'} open={drawerOpen} onClose={() => setDrawerOpen(false)} width={360}>
        {selectedNode && (<>
          <div style={{ marginBottom: 16 }}>
            <Tag color={nodeTypeColors[selectedNode.type]?.color}>{nodeTypeColors[selectedNode.type]?.label}</Tag>
          </div>
          <Paragraph><Text strong>描述：</Text>这是 {selectedNode.label} 的详细描述信息。</Paragraph>
          <div style={{ marginTop: 16 }}>
            <Text strong>挂载的知识片段：</Text>
            <List size="small" style={{ marginTop: 8 }} dataSource={[
              { title: `${selectedNode.label} 基础概念`, source: '高等数学 第三章' },
              { title: `${selectedNode.label} 应用实例`, source: '课程讲义 P.45' },
            ]} renderItem={item => (
              <List.Item><Text style={{ fontSize: 13 }}>📎 {item.title}</Text><Text type="secondary" style={{ fontSize: 11 }}>{item.source}</Text></List.Item>
            )} />
          </div>
        </>)}
      </Drawer>

      {/* Build modal */}
      <Drawer title="上传资料构建图谱" open={buildOpen} onClose={() => setBuildOpen(false)} width={480}>
        <Steps current={0} size="small" direction="vertical" items={[
          { title: '上传资料', description: '上传 PDF/文档，MinerU 解析为 Markdown' },
          { title: 'LLM 抽取', description: '从 Markdown 中自动抽取实体和关系' },
          { title: '人工校验', description: '在图谱中确认/修改/删除抽取结果' },
          { title: '知识挂载', description: '将知识片段关联到图谱节点' },
          { title: '完成', description: '图谱可用于检索问答' },
        ]} />
        <div style={{ marginTop: 24 }}>
          <Dragger beforeUpload={() => { message.success('已上传（Mock），开始解析...'); return false; }}>
            <p className="ant-upload-drag-icon"><InboxOutlined /></p>
            <p className="ant-upload-text">拖拽教材/文档到此处</p>
          </Dragger>
        </div>
      </Drawer>
    </div>
  );
};

export default KnowledgeGraphPage;
