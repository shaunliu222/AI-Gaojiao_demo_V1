import { callEduApi } from '../utils/api-client.js';

export const knowledgeSearchTool = {
  name: 'search_knowledge',
  description: '从知识图谱中检索相关知识。输入问题，返回匹配的知识节点和知识片段，以及基于知识的AI回答。',
  inputSchema: {
    type: 'object' as const,
    properties: {
      question: { type: 'string', description: '要检索的问题' },
      graphId: { type: 'number', description: '知识图谱ID（默认1）' },
    },
    required: ['question'],
  },
  async execute(args: { question: string; graphId?: number }, context?: { token?: string }) {
    const graphId = args.graphId || 1;
    const result = await callEduApi(`/api/knowledge/graphs/${graphId}/query`, {
      method: 'POST',
      body: { question: args.question },
      token: context?.token,
    });
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          answer: result.answer,
          matchedNodes: result.matchedNodes,
          snippetCount: result.snippetCount,
          snippets: result.snippets,
        }, null, 2),
      }],
    };
  },
};
