import React, { useState, useEffect } from 'react';
import { Card, Tag, Input, Button, Space, Tabs, Avatar, Typography, Modal, Form, Select, Radio, message } from 'antd';
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
    const matchType = typeFilter === 'all' || s.skillType === typeFilter;
    const matchOwner = ownerFilter === 'all' || (ownerFilter === 'public' ? s.isPublic : !s.isPublic);
    return matchSearch && matchType && matchOwner;
  });

  const [editingSkill, setEditingSkill] = useState<any>(null);

  const handleEdit = (skill: any) => {
    setEditingSkill(skill);
    const cfg = skill.config || {};
    form.setFieldsValue({
      name: skill.name, description: skill.description, type: skill.skillType, isPublic: skill.isPublic,
      triggerCondition: cfg.triggerCondition, executionType: cfg.executionType || 'api',
      method: cfg.method, endpoint: cfg.endpoint, headers: cfg.headers,
      parameters: cfg.parameters, mcpTool: cfg.mcpTool, codeSnippet: cfg.codeSnippet, outputFormat: cfg.outputFormat,
    });
    setCreateOpen(true);
  };

  const handleCreate = () => {
    form.validateFields().then(async (values) => {
      try {
        const config = {
          triggerCondition: values.triggerCondition,
          executionType: values.executionType,
          method: values.method,
          endpoint: values.endpoint,
          headers: values.headers,
          parameters: values.parameters,
          mcpTool: values.mcpTool,
          codeSnippet: values.codeSnippet,
          outputFormat: values.outputFormat,
        };
        const payload = {
          name: values.name,
          description: values.description,
          skillType: values.type,
          isPublic: values.isPublic ?? true,
          config,
        };
        if (editingSkill) {
          await skillApi.update(editingSkill.id, payload);
          message.success('更新成功');
        } else {
          await skillApi.create(payload);
          message.success('Skill 创建成功');
        }
        setCreateOpen(false);
        setEditingSkill(null);
        form.resetFields();
        skillApi.list().then((res: any) => setSkills(res.data || []));
      } catch { message.error('操作失败'); }
    });
  };

  const handleDelete = (id: number) => {
    Modal.confirm({ title: '确认删除', content: '删除后引用该 Skill 的 Agent 将无法调用', onOk: async () => {
      try {
        await skillApi.delete(id);
        message.success('删除成功');
        setSkills(skills.filter(s => s.id !== id));
      } catch { message.error('删除失败'); }
    } });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Skill Hub</h2>
        <Space>
          <Input placeholder="搜索 Skill..." prefix={<SearchOutlined />} value={search} onChange={e => setSearch(e.target.value)} style={{ width: 240, borderRadius: 8 }} allowClear />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingSkill(null); form.resetFields(); setCreateOpen(true); }} style={{ background: '#1a1a2e', borderRadius: 8 }}>创建 Skill</Button>
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
          return (
            <Card key={skill.id} hoverable style={{ borderRadius: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <Avatar size={40} style={{ background: typeMap[skill.skillType]?.color || '#1a1a2e', flexShrink: 0 }} icon={<ThunderboltOutlined />} />
                <div style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: 600 }}>{skill.name}</Text>
                  <div>
                    <Tag color={typeMap[skill.skillType]?.color}>{typeMap[skill.skillType]?.label || skill.skillType}</Tag>
                    <Tag color={skill.isPublic ? 'blue' : 'red'}>{skill.isPublic ? '公共' : '私有'}</Tag>
                  </div>
                </div>
              </div>
              <Paragraph type="secondary" ellipsis={{ rows: 2 }} style={{ minHeight: 44 }}>{skill.description}</Paragraph>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Skill ID: {skill.id}</Text>
                <Space>
                  <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(skill)}>编辑</Button>
                  <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(skill.id)}>删除</Button>
                </Space>
              </div>
            </Card>
          );
        })}
      </div>

      <Modal title={editingSkill ? '编辑 Skill' : '创建 Skill'} open={createOpen} onCancel={() => { setCreateOpen(false); setEditingSkill(null); }} onOk={handleCreate} width={600} okText={editingSkill ? '保存' : '创建'} okButtonProps={{ style: { background: '#1a1a2e' } }}>
        <Form form={form} layout="vertical" initialValues={{ type: 'tool', isPublic: true, executionType: 'api', method: 'GET' }}>
          <div style={{ background: '#f6f8fa', padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13, color: '#666' }}>
            Skill 是 Agent 可调用的能力单元。定义 Skill 后，可在创建智能体时选择赋予 Agent。
          </div>

          <Form.Item name="name" label="Skill 名称" rules={[{ required: true, message: '请输入 Skill 名称' }]}>
            <Input placeholder="如：教务查询、知识库检索、代码执行" />
          </Form.Item>

          <Form.Item name="description" label="功能描述" rules={[{ required: true, message: '请描述 Skill 功能' }]} extra="清晰的描述帮助 Agent 判断何时调用该 Skill">
            <TextArea rows={2} placeholder="用一句话描述该 Skill 能做什么。如：查询学生的课表、成绩和选课信息" />
          </Form.Item>

          <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
            <Form.Item name="type" label="Skill 类型" style={{ flex: 1 }}>
              <Select options={[
                { label: '🔧 工具 — 执行操作', value: 'tool' },
                { label: '🔍 查询 — 检索信息', value: 'query' },
                { label: '✨ 生成 — 创建内容', value: 'generate' },
              ]} />
            </Form.Item>
            <Form.Item name="isPublic" label="可见性" style={{ flex: 1 }}>
              <Radio.Group options={[{ label: '🔒 私有', value: false }, { label: '🌐 公共', value: true }]} />
            </Form.Item>
          </Space>

          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.isPublic !== cur.isPublic}>
            {({ getFieldValue }) => getFieldValue('isPublic') === true ? (
              <Form.Item name="authorizedOrgs" label="授权学院（公共时可选择授权范围）">
                <Select mode="multiple" placeholder="不选则全校可用" options={[
                  { label: '全校', value: 'ALL' },
                  { label: '计算机学院', value: 'CS' },
                  { label: '信息工程学院', value: 'IE' },
                  { label: '数学学院', value: 'MATH' },
                ]} />
              </Form.Item>
            ) : null}
          </Form.Item>

          <div style={{ background: '#f0f5ff', padding: '8px 12px', borderRadius: 6, marginBottom: 12, fontSize: 12, color: '#1a1a2e', fontWeight: 500 }}>
            触发与执行配置
          </div>

          <Form.Item name="triggerCondition" label="触发条件" extra="Agent 在什么场景下应调用此 Skill">
            <Input placeholder="如：当用户询问课表、成绩、选课相关问题时" />
          </Form.Item>

          <Form.Item name="executionType" label="执行方式">
            <Select options={[
              { label: 'REST API — 调用外部 HTTP 接口', value: 'api' },
              { label: 'MCP 工具 — 调用 MCP Server 注册的工具', value: 'mcp' },
              { label: '内置函数 — 使用平台内置能力', value: 'builtin' },
              { label: '自定义代码 — Python/JavaScript 脚本', value: 'code' },
            ]} />
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.executionType !== cur.executionType}>
            {({ getFieldValue }) => {
              const execType = getFieldValue('executionType');
              if (execType === 'api') return (<>
                <Space style={{ width: '100%' }}>
                  <Form.Item name="method" label="请求方法" style={{ width: 120 }}>
                    <Select options={[{ label: 'GET', value: 'GET' }, { label: 'POST', value: 'POST' }, { label: 'PUT', value: 'PUT' }]} />
                  </Form.Item>
                  <Form.Item name="endpoint" label="API 端点" style={{ flex: 1 }}>
                    <Input placeholder="https://api.example.com/query" />
                  </Form.Item>
                </Space>
                <Form.Item name="headers" label="请求头（可选）">
                  <Input placeholder='如：Authorization: Bearer xxx' />
                </Form.Item>
                <Form.Item name="parameters" label="参数说明" extra="Agent 调用时需要传递的参数">
                  <TextArea rows={2} placeholder='如：student_id (学号，必填), semester (学期，可选)' />
                </Form.Item>
              </>);
              if (execType === 'mcp') return (
                <Form.Item name="mcpTool" label="MCP 工具名称">
                  <Input placeholder="如：query_schedule, query_grade" />
                </Form.Item>
              );
              if (execType === 'code') return (
                <Form.Item name="codeSnippet" label="执行代码">
                  <TextArea rows={4} placeholder="# Python 代码..." style={{ fontFamily: 'monospace', fontSize: 12 }} />
                </Form.Item>
              );
              return null;
            }}
          </Form.Item>

          <Form.Item name="outputFormat" label="输出格式（可选）" extra="Skill 返回结果的格式描述，帮助 Agent 解析结果">
            <Input placeholder='如：JSON，包含 courses 数组，每项有 name, time, room 字段' />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SkillsPage;
