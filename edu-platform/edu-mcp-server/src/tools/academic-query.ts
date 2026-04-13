import { callEduApi } from '../utils/api-client.js';

export const academicQueryTool = {
  name: 'query_academic',
  description: '查询教务信息，包括课表、成绩、选课信息。（Demo阶段返回示例数据）',
  inputSchema: {
    type: 'object' as const,
    properties: {
      queryType: { type: 'string', enum: ['schedule', 'grade', 'course'], description: '查询类型：schedule=课表, grade=成绩, course=选课' },
      studentId: { type: 'string', description: '学号（可选）' },
      semester: { type: 'string', description: '学期（可选，如 2025-2026-1）' },
    },
    required: ['queryType'],
  },
  async execute(args: { queryType: string; studentId?: string; semester?: string }) {
    // Demo: return sample data (real implementation would call 教务系统 API)
    const sampleData: Record<string, any> = {
      schedule: {
        semester: args.semester || '2025-2026-2',
        courses: [
          { name: '数据结构', time: '周一 1-2节', room: 'A301', teacher: '张教授' },
          { name: '操作系统', time: '周二 3-4节', room: 'B205', teacher: '李教授' },
          { name: '数据库原理', time: '周三 5-6节', room: 'C102', teacher: '王教授' },
          { name: '计算机网络', time: '周四 1-2节', room: 'A402', teacher: '赵教授' },
        ],
      },
      grade: {
        semester: args.semester || '2025-2026-1',
        grades: [
          { course: '高等数学', score: 92, credit: 4, gpa: 4.0 },
          { course: '线性代数', score: 85, credit: 3, gpa: 3.7 },
          { course: '程序设计', score: 95, credit: 4, gpa: 4.0 },
          { course: '大学英语', score: 78, credit: 2, gpa: 3.0 },
        ],
      },
      course: {
        available: [
          { name: '机器学习导论', credit: 3, teacher: '陈教授', capacity: '30/50' },
          { name: '深度学习基础', credit: 3, teacher: '刘教授', capacity: '45/50' },
          { name: '自然语言处理', credit: 2, teacher: '杨教授', capacity: '20/40' },
        ],
      },
    };

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(sampleData[args.queryType] || { error: 'Unknown query type' }, null, 2),
      }],
    };
  },
};
