// Mock data for all modules

export const mockModels = [
  { id: 1, name: 'GLM-4-Plus', alias: 'GLM-4-Plus', provider: 'zhipu', modelName: 'glm-4-plus', capability: 'text', status: 'active', isDefault: true, isPublic: true, contextWindow: 128000, maxOutput: 4096, userLimit: 200000, tags: ['官方', '文生文(含推理)'] },
  { id: 2, name: 'Qwen-Max', alias: 'Qwen-Max', provider: 'qwen', modelName: 'qwen-max', capability: 'text', status: 'active', isDefault: false, isPublic: true, contextWindow: 32000, maxOutput: 8192, userLimit: 100000, tags: ['官方', '文生文(含推理)'] },
  { id: 3, name: 'DeepSeek-V3', alias: 'DeepSeek-V3', provider: 'deepseek', modelName: 'deepseek-chat', capability: 'text', status: 'active', isDefault: false, isPublic: false, contextWindow: 64000, maxOutput: 4096, userLimit: 200000, tags: ['私有', '文生文(含推理)'] },
  { id: 4, name: 'GLM-4V', alias: 'GLM-4V', provider: 'zhipu', modelName: 'glm-4v', capability: 'image', status: 'active', isDefault: false, isPublic: true, contextWindow: 2000, maxOutput: 1024, userLimit: 50000, tags: ['官方', '图生文'] },
  { id: 5, name: 'CogView-3', alias: 'CogView-3', provider: 'zhipu', modelName: 'cogview-3', capability: 'image_gen', status: 'disabled', isDefault: false, isPublic: false, contextWindow: 100, maxOutput: 8189, userLimit: 8189, tags: ['私有', '文生图'] },
];

export const mockAgents = [
  { id: 1, name: '智能助教', description: '自动答疑、作业批改、知识点讲解', category: 'teaching', agentType: 'openclaw', status: 'published', isPublic: true, useCount: 1234, avatar: '🤖', owner: 'admin' },
  { id: 2, name: '论文助手', description: '论文阅读、文献检索、写作辅导', category: 'research', agentType: 'openclaw', status: 'published', isPublic: true, useCount: 856, avatar: '📚', owner: 'admin' },
  { id: 3, name: '实验设计', description: '实验方案设计、数据分析辅助', category: 'training', agentType: 'lowcode', status: 'published', isPublic: true, useCount: 432, avatar: '🔬', owner: 'admin' },
  { id: 4, name: '编程辅导', description: 'Python/Java 编程练习、代码审查', category: 'training', agentType: 'openclaw', status: 'published', isPublic: true, useCount: 678, avatar: '💻', owner: 'admin' },
  { id: 5, name: '校园导航', description: '校园信息查询、办事指南', category: 'management', agentType: 'api', status: 'published', isPublic: true, useCount: 2100, avatar: '🏫', owner: 'admin' },
  { id: 6, name: '我的数学助手', description: '高等数学专题辅导', category: 'teaching', agentType: 'openclaw', status: 'draft', isPublic: false, useCount: 12, avatar: '📐', owner: 'teacher' },
];

export const mockSessions = [
  { id: 's1', title: '请介绍一下你的能力', agentId: 1, agentName: 'Main Agent', updatedAt: '2026-04-12 10:30', messageCount: 5 },
  { id: 's2', title: '世界上有哪些令人惊叹的...', agentId: 1, agentName: 'Main Agent', updatedAt: '2026-04-11 16:20', messageCount: 8 },
  { id: 's3', title: '帮我分析这篇论文的核心...', agentId: 2, agentName: '论文助手', updatedAt: '2026-04-10 14:00', messageCount: 12 },
  { id: 's4', title: '下一个天文奇观什么时候...', agentId: 1, agentName: 'Main Agent', updatedAt: '2026-04-09 09:15', messageCount: 3 },
];

export const mockMessages: Record<string, Array<{ id: string; role: 'user' | 'assistant'; content: string; timestamp: string; references?: Array<{ title: string; source: string }> }>> = {
  s1: [
    { id: 'm1', role: 'user', content: '请介绍一下你的能力', timestamp: '2026-04-12 10:30' },
    { id: 'm2', role: 'assistant', content: '你好！我是 Main Agent，高教AI平台的智能助手。我可以帮助你：\n\n1. **知识问答** — 基于课程知识图谱回答学科问题\n2. **学习规划** — 根据你的能力画像推荐学习路径\n3. **文献检索** — 搜索和分析学术论文\n4. **编程辅导** — Python、Java 等编程练习\n5. **校务查询** — 课表、成绩、选课等信息\n\n你想了解哪方面的内容？', timestamp: '2026-04-12 10:30', references: [{ title: '平台功能说明', source: '系统文档 v1.0' }] },
  ],
};

export const mockResources = [
  { id: 1, name: '高等数学(上册)', originalName: '高等数学上册.pdf', fileType: 'pdf', fileSize: 12582912, parseStatus: 'parsed', vectorStatus: 'done', isPublic: true, categoryName: '教材课件', owner: 'admin', createdAt: '2026-04-01' },
  { id: 2, name: '机器学习导论 PPT', originalName: '机器学习导论.pptx', fileType: 'ppt', fileSize: 5872025, parseStatus: 'parsing', vectorStatus: 'pending', isPublic: true, categoryName: '教材课件', owner: 'teacher', createdAt: '2026-04-05' },
  { id: 3, name: '编程实训视频-Python基础', originalName: '编程实训.mp4', fileType: 'mp4', fileSize: 1288490188, parseStatus: 'pending', vectorStatus: 'pending', isPublic: false, categoryName: '视频音频', owner: 'teacher', createdAt: '2026-04-08' },
  { id: 4, name: '数据结构期末试卷', originalName: '数据结构试卷2025.docx', fileType: 'word', fileSize: 245760, parseStatus: 'parsed', vectorStatus: 'done', isPublic: true, categoryName: '试题试卷', owner: 'admin', createdAt: '2026-03-20' },
  { id: 5, name: 'Transformer 论文精读', originalName: 'attention_is_all_you_need.pdf', fileType: 'pdf', fileSize: 2097152, parseStatus: 'parsed', vectorStatus: 'done', isPublic: true, categoryName: '论文文献', owner: 'teacher', createdAt: '2026-04-10' },
];

export const mockUsers = [
  { id: 1, username: 'admin', name: 'System Admin', email: 'admin@edu.ai', role: 'admin', org: 'University', status: 1 },
  { id: 2, username: 'teacher', name: 'Zhang Teacher', email: 'teacher@edu.ai', role: 'teacher', org: '计算机学院', status: 1 },
  { id: 3, username: 'student', name: 'Li Student', email: 'student@edu.ai', role: 'student', org: '计算机学院', status: 1 },
  { id: 4, username: 'wang_prof', name: 'Wang Professor', email: 'wang@edu.ai', role: 'teacher', org: '信息工程学院', status: 1 },
  { id: 5, username: 'zhao_stu', name: 'Zhao Student', email: 'zhao@edu.ai', role: 'student', org: '数学学院', status: 0 },
];

export const mockKeywords = [
  { id: 1, word: '暴力', category: 'violence', severity: 'block', status: 1 },
  { id: 2, word: '赌博', category: 'gambling', severity: 'block', status: 1 },
  { id: 3, word: '代写论文', category: 'academic', severity: 'warn', status: 1 },
  { id: 4, word: '翻墙', category: 'politics', severity: 'block', status: 1 },
  { id: 5, word: '枪支', category: 'violence', severity: 'block', status: 0 },
];

export const mockAuditLogs = [
  { id: 1, userId: 3, username: 'Li Student', input: '帮我代写一篇毕业论文', hitRule: '代写论文', action: 'warned', createdAt: '2026-04-12 09:30' },
  { id: 2, userId: 5, username: 'Zhao Student', input: '如何翻墙访问外网', hitRule: '翻墙', action: 'blocked', createdAt: '2026-04-11 15:20' },
];

export const mockKnowledgeGraphNodes = [
  { id: 'n1', label: '数字媒体技术', type: 'major', color: '#52c41a', x: 400, y: 300 },
  { id: 'n2', label: '影视后期制作', type: 'position', color: '#fa8c16', x: 200, y: 150 },
  { id: 'n3', label: '3D建模', type: 'position', color: '#fa8c16', x: 400, y: 100 },
  { id: 'n4', label: '算法工程', type: 'position', color: '#fa8c16', x: 600, y: 150 },
  { id: 'n5', label: '交互设计', type: 'position', color: '#722ed1', x: 600, y: 450 },
  { id: 'n6', label: 'AIGC工程', type: 'position', color: '#faad14', x: 200, y: 450 },
  { id: 'n7', label: '机器视觉系统', type: 'skill', color: '#eb2f96', x: 400, y: 200 },
  { id: 'n8', label: '图像处理', type: 'skill', color: '#eb2f96', x: 300, y: 250 },
  { id: 'n9', label: '模型训练', type: 'skill', color: '#1890ff', x: 500, y: 250 },
  { id: 'n10', label: '视频剪辑', type: 'skill', color: '#1890ff', x: 150, y: 250 },
  { id: 'n11', label: '深度学习基础', type: 'knowledge', color: '#ff4d4f', x: 350, y: 400 },
  { id: 'n12', label: 'Python编程', type: 'knowledge', color: '#ff4d4f', x: 450, y: 400 },
];

export const mockKnowledgeGraphEdges = [
  { source: 'n1', target: 'n2' }, { source: 'n1', target: 'n3' },
  { source: 'n1', target: 'n4' }, { source: 'n1', target: 'n5' },
  { source: 'n1', target: 'n6' }, { source: 'n2', target: 'n10' },
  { source: 'n3', target: 'n7' }, { source: 'n4', target: 'n9' },
  { source: 'n7', target: 'n8' }, { source: 'n9', target: 'n11' },
  { source: 'n9', target: 'n12' }, { source: 'n6', target: 'n11' },
];

export const mockSkills = [
  { id: 1, name: '教务查询', description: '查询课表、成绩、选课信息', type: 'query', isPublic: true, status: 1 },
  { id: 2, name: '知识库检索', description: '从向量知识库检索相关内容', type: 'query', isPublic: true, status: 1 },
  { id: 3, name: '代码执行', description: '在沙箱中执行 Python/Java 代码', type: 'tool', isPublic: true, status: 1 },
  { id: 4, name: '论文搜索', description: '搜索学术论文数据库', type: 'query', isPublic: true, status: 1 },
];

export const mockMcpServers = [
  { id: 1, name: '教务系统 MCP', endpointUrl: 'http://jw.edu.cn/mcp', transportType: 'http', status: 'active', isPublic: true },
  { id: 2, name: '图书馆 MCP', endpointUrl: 'http://lib.edu.cn/mcp', transportType: 'sse', status: 'active', isPublic: true },
  { id: 3, name: '实验室预约 MCP', endpointUrl: 'http://lab.edu.cn/mcp', transportType: 'http', status: 'error', isPublic: false },
];

export const mockChannels = [
  { id: 1, name: '飞书机器人', channelType: 'feishu', status: 'active', boundAgents: ['智能助教', '校园导航'] },
  { id: 2, name: '微信公众号', channelType: 'wechat', status: 'active', boundAgents: ['智能助教'] },
  { id: 3, name: '校园门户', channelType: 'portal', status: 'inactive', boundAgents: [] },
];

// Mock streaming response
export function mockStreamResponse(message: string): ReadableStream<string> {
  const response = `收到你的问题："${message}"\n\n让我来帮你分析一下：\n\n**分析结果**\n\n这是一个很好的问题。根据课程知识库中的相关资料，我可以告诉你：\n\n1. 首先，这个概念涉及到多个知识领域\n2. 其次，你需要理解基础的数学原理\n3. 最后，建议你参考以下学习资源\n\n> 引用自《高等数学》第三章 3.2 节\n\n希望这个回答对你有帮助！如果需要更详细的解释，请继续提问。`;

  const chars = response.split('');
  let index = 0;

  return new ReadableStream({
    pull(controller) {
      return new Promise((resolve) => {
        if (index < chars.length) {
          const chunk = chars.slice(index, index + 3).join('');
          index += 3;
          controller.enqueue(chunk);
          setTimeout(resolve, 30);
        } else {
          controller.close();
          resolve();
        }
      });
    },
  });
}

// Usage stats
export const mockUsageStats = {
  totalCalls: 15632,
  totalTokens: 8945210,
  totalCost: 125.80,
  dailyData: Array.from({ length: 30 }, (_, i) => ({
    date: `04-${String(i + 1).padStart(2, '0')}`,
    calls: Math.floor(Math.random() * 800 + 200),
    tokens: Math.floor(Math.random() * 500000 + 100000),
  })),
  modelDistribution: [
    { name: 'GLM-4-Plus', value: 45 },
    { name: 'Qwen-Max', value: 25 },
    { name: 'DeepSeek-V3', value: 20 },
    { name: 'GLM-4V', value: 10 },
  ],
};
