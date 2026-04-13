import axios from 'axios';

const request = axios.create({
  baseURL: '',
  timeout: 30000,
});

request.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

request.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default request;

// --- Auth ---
export const authApi = {
  login: (data: { username: string; password: string }) =>
    request.post('/api/auth/login', data),
  userinfo: () => request.get('/api/auth/userinfo'),
  logout: () => request.post('/api/auth/logout'),
};

export const healthApi = {
  check: () => request.get('/api/health'),
};

// --- User Management ---
export const userApi = {
  list: (params?: { page?: number; size?: number; keyword?: string }) =>
    request.get('/api/users', { params }),
  detail: (id: number) => request.get(`/api/users/${id}`),
  create: (data: any) => request.post('/api/users', data),
  update: (id: number, data: any) => request.put(`/api/users/${id}`, data),
  delete: (id: number) => request.delete(`/api/users/${id}`),
  assignRoles: (id: number, roleIds: number[]) =>
    request.put(`/api/users/${id}/roles`, roleIds),
  assignOrgs: (id: number, orgIds: number[]) =>
    request.put(`/api/users/${id}/orgs`, orgIds),
  getRoles: (id: number) => request.get(`/api/users/${id}/roles`),
  getOrgs: (id: number) => request.get(`/api/users/${id}/orgs`),
};

// --- Role Management ---
export const roleApi = {
  list: () => request.get('/api/roles'),
  create: (data: any) => request.post('/api/roles', data),
  update: (id: number, data: any) => request.put(`/api/roles/${id}`, data),
  delete: (id: number) => request.delete(`/api/roles/${id}`),
};

// --- Organization Management ---
export const orgApi = {
  tree: () => request.get('/api/orgs/tree'),
  create: (data: any) => request.post('/api/orgs', data),
  update: (id: number, data: any) => request.put(`/api/orgs/${id}`, data),
  delete: (id: number) => request.delete(`/api/orgs/${id}`),
};

// --- Security ---
export const securityApi = {
  listKeywords: (params?: { page?: number; size?: number; keyword?: string; category?: string }) =>
    request.get('/api/security/keywords', { params }),
  createKeyword: (data: any) => request.post('/api/security/keywords', data),
  updateKeyword: (id: number, data: any) => request.put(`/api/security/keywords/${id}`, data),
  deleteKeyword: (id: number) => request.delete(`/api/security/keywords/${id}`),
  batchImportKeywords: (data: any[]) => request.post('/api/security/keywords/batch-import', data),
  toggleKeywordStatus: (id: number, status: number) =>
    request.put(`/api/security/keywords/${id}/status`, null, { params: { status } }),
  listPolicies: () => request.get('/api/security/policies'),
  createPolicy: (data: any) => request.post('/api/security/policies', data),
  updatePolicy: (id: number, data: any) => request.put(`/api/security/policies/${id}`, data),
  deletePolicy: (id: number) => request.delete(`/api/security/policies/${id}`),
  auditLogs: (params?: { page?: number; size?: number; userId?: number; hitRule?: string }) =>
    request.get('/api/security/audit-logs', { params }),
};

// --- Model Management ---
export const modelApi = {
  list: (capability?: string) =>
    request.get('/api/models', { params: { capability: capability || 'all' } }),
  available: () => request.get('/api/models/available'),
  detail: (id: number) => request.get(`/api/models/${id}`),
  create: (data: any) => request.post('/api/models', data),
  update: (id: number, data: any) => request.put(`/api/models/${id}`, data),
  delete: (id: number) => request.delete(`/api/models/${id}`),
  setStatus: (id: number, status: string) =>
    request.put(`/api/models/${id}/status`, null, { params: { status } }),
  setDefault: (id: number) => request.put(`/api/models/${id}/default`),
  getPermissions: (id: number) => request.get(`/api/models/${id}/permissions`),
  setPermissions: (id: number, roleIds: number[]) =>
    request.put(`/api/models/${id}/permissions`, roleIds),
};

// --- Resource Center ---
export const resourceApi = {
  list: (params?: { page?: number; size?: number; keyword?: string; fileType?: string; categoryId?: number }) =>
    request.get('/api/resources', { params }),
  detail: (id: number) => request.get(`/api/resources/${id}`),
  upload: (file: File, categoryId?: number) => {
    const formData = new FormData();
    formData.append('file', file);
    if (categoryId) formData.append('categoryId', String(categoryId));
    return request.post('/api/resources/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  delete: (id: number) => request.delete(`/api/resources/${id}`),
  setPermission: (id: number, isPublic: boolean) =>
    request.put(`/api/resources/${id}/permission`, null, { params: { isPublic } }),
  parseStatus: (id: number) => request.get(`/api/resources/${id}/parse-status`),
  categories: () => request.get('/api/resources/categories'),
};

// --- Agent Management ---
export const agentApi = {
  list: (params?: { page?: number; size?: number; keyword?: string; category?: string }) =>
    request.get('/api/agents', { params }),
  publicList: () => request.get('/api/agents/public'),
  detail: (id: number) => request.get(`/api/agents/${id}`),
  create: (data: any) => request.post('/api/agents', data),
  update: (id: number, data: any) => request.put(`/api/agents/${id}`, data),
  delete: (id: number) => request.delete(`/api/agents/${id}`),
  publish: (id: number, data: any) => request.post(`/api/agents/${id}/publish`, data),
  publishes: (id: number) => request.get(`/api/agents/${id}/publishes`),
};

// --- Skill Management ---
export const skillApi = {
  list: (params?: { skillType?: string; isPublic?: boolean }) =>
    request.get('/api/skills', { params }),
  create: (data: any) => request.post('/api/skills', data),
  update: (id: number, data: any) => request.put(`/api/skills/${id}`, data),
  delete: (id: number) => request.delete(`/api/skills/${id}`),
};

// --- MCP Server Management ---
export const mcpApi = {
  list: () => request.get('/api/mcp-servers'),
  create: (data: any) => request.post('/api/mcp-servers', data),
  update: (id: number, data: any) => request.put(`/api/mcp-servers/${id}`, data),
  delete: (id: number) => request.delete(`/api/mcp-servers/${id}`),
};

// --- Channel Management ---
export const channelApi = {
  list: () => request.get('/api/channels'),
  create: (data: any) => request.post('/api/channels', data),
  update: (id: number, data: any) => request.put(`/api/channels/${id}`, data),
  delete: (id: number) => request.delete(`/api/channels/${id}`),
  bindAgent: (channelId: number, agentId: number) =>
    request.post(`/api/channels/${channelId}/bind-agent`, null, { params: { agentId } }),
  unbindAgent: (channelId: number, agentId: number) =>
    request.delete(`/api/channels/${channelId}/unbind-agent`, { params: { agentId } }),
  bindings: (channelId: number) => request.get(`/api/channels/${channelId}/bindings`),
};

// --- Knowledge Graph ---
export const knowledgeApi = {
  listGraphs: () => request.get('/api/knowledge/graphs'),
  createGraph: (data: any) => request.post('/api/knowledge/graphs', data),
  getGraph: (id: number) => request.get(`/api/knowledge/graphs/${id}`),
  deleteGraph: (id: number) => request.delete(`/api/knowledge/graphs/${id}`),
  graphData: (id: number) => request.get(`/api/knowledge/graphs/${id}/data`),
  addNode: (graphId: number, data: any) => request.post(`/api/knowledge/graphs/${graphId}/nodes`, data),
  deleteNode: (graphId: number, nodeId: number) => request.delete(`/api/knowledge/graphs/${graphId}/nodes/${nodeId}`),
  addEdge: (graphId: number, data: any) => request.post(`/api/knowledge/graphs/${graphId}/edges`, data),
  deleteEdge: (graphId: number, edgeId: number) => request.delete(`/api/knowledge/graphs/${graphId}/edges/${edgeId}`),
  createSkeleton: (graphId: number, data: any) => request.post(`/api/knowledge/graphs/${graphId}/skeleton`, data),
  triggerBuild: (graphId: number, text: string) => request.post(`/api/knowledge/graphs/${graphId}/build`, { text }),
  getBuildTask: (graphId: number, taskId: number) => request.get(`/api/knowledge/graphs/${graphId}/build-tasks/${taskId}`),
  approveBuild: (graphId: number, taskId: number, data: any) => request.post(`/api/knowledge/graphs/${graphId}/build-tasks/${taskId}/approve`, data),
  attach: (graphId: number, data: any) => request.post(`/api/knowledge/graphs/${graphId}/attach`, data),
  attachments: (graphId: number, nodeId?: number) => request.get(`/api/knowledge/graphs/${graphId}/attachments`, { params: { nodeId } }),
  query: (graphId: number, question: string) => request.post(`/api/knowledge/graphs/${graphId}/query`, { question }),
};

// --- Competency Graph ---
export const competencyApi = {
  listGraphs: () => request.get('/api/competency/graphs'),
  createGraph: (data: any) => request.post('/api/competency/graphs', data),
  graphData: (id: number) => request.get(`/api/competency/graphs/${id}/data`),
  assess: (data: any) => request.post('/api/competency/assess', data),
  gapAnalysis: (assessmentId: number) => request.post('/api/competency/gap-analysis', null, { params: { assessmentId } }),
  generatePath: (assessmentId: number) => request.post('/api/competency/generate-path', null, { params: { assessmentId } }),
  learningPath: () => request.get('/api/competency/learning-path'),
};

// --- AI Chat ---
export const aiChatApi = {
  chat: (data: { model?: string; messages: any[]; agentId?: string }) =>
    request.post('/api/ai/chat', data),
  sessions: () => request.get('/api/ai/sessions'),
  deleteSession: (id: number) => request.delete(`/api/ai/sessions/${id}`),
  gatewayHealth: () => request.get('/api/ai/gateway/health'),
  chatStream: async (
    data: { model?: string; messages: any[]; agentId?: string },
    onData: (chunk: string) => void,
    onDone: () => void,
    onError: (err: string) => void
  ) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('/api/ai/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...data, stream: true }),
      });
      if (!response.ok) {
        const text = await response.text();
        onError(text || `HTTP ${response.status}`);
        return;
      }
      const reader = response.body?.getReader();
      if (!reader) { onError('No reader'); return; }
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n');
        for (const line of lines) {
          if (line.startsWith('data:')) {
            const payload = line.slice(5).trim();
            if (payload === '[DONE]') {
              onDone();
              return;
            }
            if (payload) onData(payload);
          }
        }
      }
      onDone();
    } catch (err: any) {
      onError(err.message || 'Stream failed');
    }
  },
};
