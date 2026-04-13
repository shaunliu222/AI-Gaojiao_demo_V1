const API_BASE = process.env.EDU_API_URL || 'http://localhost:8080';

export async function callEduApi(path: string, options: {
  method?: string;
  body?: any;
  token?: string;
} = {}): Promise<any> {
  const { method = 'GET', body, token } = options;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return data.data; // Unwrap R<T> wrapper
}
