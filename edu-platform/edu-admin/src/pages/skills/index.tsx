import React, { useState, useEffect } from 'react';
import { Card, Tag, Input, Button, Space, Tabs, Avatar, Typography, Modal, Form, Select, message } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { skillApi } from '@/services/request';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

const typeMap: Record<string, { color: string; label: string }> = {
  tool: { color: 'blue', label: '工具' },
  query: { color: 'green', label: '查询' },
  generate: { color: 'purple', label: '生成' },
};

const SkillsPage: React.FC = () => {
  const [skills, setSkills] = useState<any[]>([]);

  useEffect(() => {
    skillApi.list().then((res: any) => setSkills(res.data || [])).catch(() => {});
  }, []);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [form] = Form.useForm();

  const filtered = skills.filter(s => {
    const matchSearch = !search || s.name.includes(search) || s.description.includes(search);
    const matchType = typeFilter === 'all' || s.type === typeFilter;
    const matchOwner = ownerFilter === 'all' || (ownerFilter === 'public' ? s.isPublic : !s.isPublic);
    return matchSearch && matchType && matchOwner;
  });

  const getRefAgentCount = (skillId: number) => mockAgents.filter(() => Math.random() > 0.5).length;

  const handleCreate = () => {
    form.validateFields().then(values => {
      setSkills([{ id: Date.now(), ...values, status: 1, isPublic: values.isPublic ?? true }, ...skills]);
      setCreateOpen(false);
      form.resetFields();
      message.success('Skill 创建成功');
    });
  };

  const handleDelete = (id: number) => {
    Modal.confirm({ title: '确认删除', content: '删除后引用该 Skill 的 Agent 将无法调用', onOk: () => setSkills(skills.filter(s => s.id !== id)) });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Skill Hub</h2>
        <Space>
          <Input placeholder="搜索 Skill..." prefix={<SearchOutlined />} value={search} onChange={e => setSearch(e.target.value)} style={{ width: 240, borderRadius: 8 }} allowClear />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)} style={{ background: '#1a1a2e', borderRadius: 8 }}>创建 Skill</Button>
        </Space>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <Tabs activeKey={typeFilter} onChange={setTypeFilter} items={[
          { key: 'all', label: '全部' }, { key: 'tool', label: '工具' },
          { key: 'query', label: '查询' }, { key: 'generate', label: '生成' },
        ]} style={{ flex: 1 }} />
        <Tabs activeKey={ownerFilter} onChange={setOwnerFilter} items={[
          { key: 'all', label: '全部' }, { key: 'public', label: '公共' }, { key: 'mine', label: '我的' },
        ]} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {filtered.map(skill => {
          const refCount = getRefAgentCount(skill.id);
          return (
            <Card key={skill.id} hoverable style={{ borderRadius: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <Avatar size={40} style={{ background: typeMap[skill.type]?.color || '#1a1a2e', flexShrink: 0 }} icon={<ThunderboltOutlined />} />
                <div style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: 600 }}>{skill.name}</Text>
                  <div>
                    <Tag color={typeMap[skill.type]?.color}>{typeMap[skill.type]?.label}</Tag>
                    <Tag color={skill.isPublic ? 'blue' : 'red'}>{skill.isPublic ? '公共' : '私有'}</Tag>
                  </div>
                </div>
              </div>
              <Paragraph type="secondary" ellipsis={{ rows: 2 }} style={{ minHeight: 44 }}>{skill.description}</Paragraph>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>已被 {refCount} 个智能体引用</Text>
                <Space>
                  <Button type="link" size="small" icon={<EditOutlined />}>编辑</Button>
                  <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(skill.id)}>删除</Button>
                </Space>
              </div>
            </Card>
          );
        })}
      </div>

      <Modal title="创建 Skill" open={createOpen} onCancel={() => setCreateOpen(false)} onOk={handleCreate} width={520} okText="创建" okButtonProps={{ style: { background: '#1a1a2e' } }}>
        <Form form={form} layout="vertical" initialValues={{ type: 'tool', isPublic: true }}>
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入 Skill 名称' }]}>
            <Input placeholder="如：教务查询" />
          </Form.Item>
          <Form.Item name="description" label="描述" rules={[{ required: true }]}>
            <TextArea rows={3} placeholder="描述该 Skill 的功能和用途" />
          </Form.Item>
          <Form.Item name="type" label="类型">
            <Select options={[
              { label: '工具 — 执行操作（如查询数据库、调用API）', value: 'tool' },
              { label: '查询 — 检索信息（如知识库搜索、文献检索）', value: 'query' },
              { label: '生成 — 创建内容（如生成报告、出题）', value: 'generate' },
            ]} />
          </Form.Item>
          <Form.Item name="triggerCondition" label="触发条件（可选）">
            <Input placeholder="如：当用户询问课表相关问题时触发" />
          </Form.Item>
          <Form.Item name="config" label="执行配置（JSON）">
            <TextArea rows={4} placeholder='{"endpoint": "http://...", "method": "GET"}' style={{ fontFamily: 'monospace' }} />
          </Form.Item>
          <Form.Item name="isPublic" label="权限">
            <Select options={[{ label: '公共 — 全校可用', value: true }, { label: '私有 — 仅自己可用', value: false }]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SkillsPage;
