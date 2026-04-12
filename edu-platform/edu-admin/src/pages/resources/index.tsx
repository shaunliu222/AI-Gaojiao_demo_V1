import React, { useState } from 'react';
import { Table, Tag, Input, Button, Tabs, Space, Upload, Progress, Modal, Select, Radio, message } from 'antd';
import { UploadOutlined, SearchOutlined, InboxOutlined, EyeOutlined, DeleteOutlined } from '@ant-design/icons';
import { mockResources } from '@/mocks/data';

const { Dragger } = Upload;

const statusMap: Record<string, { color: string; text: string }> = {
  parsed: { color: 'green', text: '已解析' }, parsing: { color: 'blue', text: '解析中' },
  pending: { color: 'default', text: '待处理' }, failed: { color: 'red', text: '失败' },
  done: { color: 'green', text: '已完成' }, vectorizing: { color: 'blue', text: '向量化中' },
};

const ResourcesPage: React.FC = () => {
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);

  const columns = [
    { title: '名称', dataIndex: 'name', render: (t: string, r: any) => <span>{r.fileType === 'pdf' ? '📄' : r.fileType === 'ppt' ? '📊' : r.fileType === 'mp4' ? '🎥' : '📝'} {t}</span> },
    { title: '类型', dataIndex: 'fileType', render: (t: string) => <Tag>{t.toUpperCase()}</Tag>, width: 80 },
    { title: '大小', dataIndex: 'fileSize', render: (v: number) => v > 1073741824 ? `${(v / 1073741824).toFixed(1)} GB` : `${(v / 1048576).toFixed(1)} MB`, width: 90 },
    { title: '解析状态', dataIndex: 'parseStatus', render: (t: string) => <Tag color={statusMap[t]?.color}>{statusMap[t]?.text}</Tag>, width: 100 },
    { title: '向量化', dataIndex: 'vectorStatus', render: (t: string) => <Tag color={statusMap[t]?.color}>{statusMap[t]?.text}</Tag>, width: 100 },
    { title: '权限', dataIndex: 'isPublic', render: (v: boolean) => <Tag color={v ? 'blue' : 'red'}>{v ? '公共' : '私有'}</Tag>, width: 80 },
    { title: '分类', dataIndex: 'categoryName', width: 100 },
    { title: '上传时间', dataIndex: 'createdAt', width: 110 },
    { title: '操作', width: 120, render: () => <Space><Button type="link" size="small" icon={<EyeOutlined />}>预览</Button><Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button></Space> },
  ];

  const filtered = mockResources.filter(r => {
    const matchSearch = !search || r.name.includes(search);
    const matchTab = tab === 'all' || r.categoryName === { materials: '教材课件', exams: '试题试卷', media: '视频音频', papers: '论文文献' }[tab];
    return matchSearch && matchTab;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>教学资源管理</h2>
        <Space>
          <Input placeholder="搜索资源..." prefix={<SearchOutlined />} value={search} onChange={e => setSearch(e.target.value)} style={{ width: 240, borderRadius: 8 }} allowClear />
          <Button type="primary" icon={<UploadOutlined />} onClick={() => setUploadOpen(true)} style={{ background: '#1a1a2e', borderRadius: 8 }}>批量上传</Button>
        </Space>
      </div>

      <Tabs activeKey={tab} onChange={setTab} items={[
        { key: 'all', label: '全部' }, { key: 'materials', label: '教材课件' },
        { key: 'exams', label: '试题试卷' }, { key: 'media', label: '视频音频' },
        { key: 'papers', label: '论文文献' }, { key: 'other', label: '其他' },
      ]} style={{ marginBottom: 8 }} />

      <Table dataSource={filtered} columns={columns} rowKey="id" size="small" pagination={{ pageSize: 10, showTotal: t => `共 ${t} 条` }}
        rowSelection={{ type: 'checkbox' }} />

      <Modal title="批量上传资源" open={uploadOpen} onCancel={() => setUploadOpen(false)} footer={null} width={520}>
        <Dragger multiple accept=".pdf,.ppt,.pptx,.doc,.docx,.md,.mp4,.zip" beforeUpload={() => { message.success('文件已加入上传队列（Mock）'); return false; }}>
          <p className="ant-upload-drag-icon"><InboxOutlined /></p>
          <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
          <p className="ant-upload-hint">支持 PDF、PPT、Word、Markdown、MP4、ZIP</p>
        </Dragger>
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 13, color: '#999', marginBottom: 8 }}>入库流程：上传 → MinerU 解析 → 向量化 → 图谱挂载</div>
          <Progress percent={0} status="active" />
        </div>
      </Modal>
    </div>
  );
};

export default ResourcesPage;
