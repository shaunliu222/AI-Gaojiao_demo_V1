import { callEduApi } from '../utils/api-client.js';

export const resourceSearchTool = {
  name: 'search_resources',
  description: '搜索教学资源（教材、课件、试题、论文等）。返回匹配的资源列表。',
  inputSchema: {
    type: 'object' as const,
    properties: {
      keyword: { type: 'string', description: '搜索关键词' },
      fileType: { type: 'string', description: '文件类型筛选（pdf/ppt/word/md）' },
    },
    required: ['keyword'],
  },
  async execute(args: { keyword: string; fileType?: string }, context?: { token?: string }) {
    const params = new URLSearchParams({ page: '1', size: '10', keyword: args.keyword });
    if (args.fileType) params.append('fileType', args.fileType);

    const result = await callEduApi(`/api/resources?${params.toString()}`, {
      token: context?.token,
    });

    const resources = (result?.list || []).map((r: any) => ({
      name: r.name,
      type: r.fileType,
      size: r.fileSize,
      isPublic: r.isPublic,
      parseStatus: r.parseStatus,
    }));

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({ total: result?.total || 0, resources }, null, 2),
      }],
    };
  },
};
