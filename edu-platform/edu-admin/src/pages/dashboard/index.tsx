import React from 'react';
import { Card, Col, Row, Statistic, Table, Tag, List, Avatar, Typography } from 'antd';
import { UserOutlined, RobotOutlined, MessageOutlined, DatabaseOutlined, ApartmentOutlined, ArrowUpOutlined } from '@ant-design/icons';
import { mockUsageStats, mockAgents, mockAuditLogs } from '@/mocks/data';

const { Text } = Typography;

const DashboardPage: React.FC = () => {
  const topAgents = [...mockAgents].sort((a, b) => b.useCount - a.useCount).slice(0, 5);
  const recentActivity = [
    { title: 'Zhang Teacher 上传了《机器学习导论 PPT》', time: '10 分钟前', avatar: '📄' },
    { title: 'Li Student 与 智能助教 对话 12 轮', time: '25 分钟前', avatar: '💬' },
    { title: 'Admin 创建了安全关键词策略', time: '1 小时前', avatar: '🛡️' },
    { title: 'Wang Professor 发布了 论文助手 Agent', time: '2 小时前', avatar: '🤖' },
    { title: '新增 3 位学生注册', time: '3 小时前', avatar: '👥' },
  ];

  return (
    <div>
      <h2 style={{ marginBottom: 24, fontSize: 20, fontWeight: 600 }}>总览</h2>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card hoverable><Statistic title="总用户数" value={1256} prefix={<UserOutlined />} suffix={<Text type="success" style={{ fontSize: 12 }}><ArrowUpOutlined /> 12%</Text>} /></Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card hoverable><Statistic title="智能体数" value={23} prefix={<RobotOutlined />} valueStyle={{ color: '#722ed1' }} /></Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card hoverable><Statistic title="今日对话" value={892} prefix={<MessageOutlined />} suffix={<Text type="success" style={{ fontSize: 12 }}><ArrowUpOutlined /> 15%</Text>} /></Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card hoverable><Statistic title="资源总量" value="3.2 TB" prefix={<DatabaseOutlined />} /></Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card hoverable><Statistic title="图谱节点" value={1847} prefix={<ApartmentOutlined />} valueStyle={{ color: '#eb2f96' }} /></Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card hoverable><Statistic title="API调用量" value={mockUsageStats.totalCalls} prefix={<MessageOutlined />} /></Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="热门智能体 TOP5" size="small">
            <Table dataSource={topAgents} rowKey="id" pagination={false} size="small" columns={[
              { title: '排名', render: (_, __, i) => <Tag color={i < 3 ? 'gold' : 'default'}>{i + 1}</Tag>, width: 60 },
              { title: 'Agent', dataIndex: 'name', render: (t: string, r: any) => <span>{r.avatar} {t}</span> },
              { title: '类型', dataIndex: 'category', render: (t: string) => <Tag>{t}</Tag> },
              { title: '使用次数', dataIndex: 'useCount', sorter: (a: any, b: any) => a.useCount - b.useCount },
            ]} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="最近活动" size="small">
            <List dataSource={recentActivity} renderItem={(item) => (
              <List.Item>
                <List.Item.Meta
                  avatar={<Avatar style={{ background: '#f5f5f5' }}>{item.avatar}</Avatar>}
                  title={<Text style={{ fontSize: 13 }}>{item.title}</Text>}
                  description={<Text type="secondary" style={{ fontSize: 12 }}>{item.time}</Text>}
                />
              </List.Item>
            )} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="模型调用分布" size="small">
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {mockUsageStats.modelDistribution.map((m) => (
                <div key={m.name} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 600, color: '#1a1a2e' }}>{m.value}%</div>
                  <div style={{ fontSize: 12, color: '#999' }}>{m.name}</div>
                </div>
              ))}
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="安全拦截记录" size="small">
            <Table dataSource={mockAuditLogs} rowKey="id" pagination={false} size="small" columns={[
              { title: '用户', dataIndex: 'username' },
              { title: '命中规则', dataIndex: 'hitRule', render: (t: string) => <Tag color="red">{t}</Tag> },
              { title: '处理', dataIndex: 'action', render: (t: string) => <Tag color={t === 'blocked' ? 'red' : 'orange'}>{t}</Tag> },
              { title: '时间', dataIndex: 'createdAt' },
            ]} />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardPage;
