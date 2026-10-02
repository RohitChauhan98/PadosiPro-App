import { beforeEach, describe, expect, it } from 'vitest';
import { prisma, registerVerifyAndLogin, resetUserTables } from './helpers.js';

beforeEach(resetUserTables);

describe('GET /api/tasks', () => {
  it('returns the seeded catalogue: 10 categories, 127 tasks, ordered by name', async () => {
    const { app, token } = await registerVerifyAndLogin('tasks@example.com');
    const res = await app.inject({ method: 'GET', url: '/api/tasks', headers: { authorization: `Bearer ${token}` } });

    expect(res.statusCode).toBe(200);
    const { categories } = res.json();
    expect(categories).toHaveLength(10);
    expect(categories.reduce((sum: number, c: { tasks: unknown[] }) => sum + c.tasks.length, 0)).toBe(127);

    const categoryNames = categories.map((c: { name: string }) => c.name);
    expect(categoryNames).toEqual([...categoryNames].sort());
    for (const category of categories) {
      const taskNames = category.tasks.map((t: { name: string }) => t.name);
      expect(taskNames).toEqual([...taskNames].sort());
      for (const task of category.tasks) {
        expect(task).toEqual({ id: expect.any(String), name: expect.any(String), description: expect.any(String) });
      }
    }
  });
});

describe('PUT /api/users/me/tasks', () => {
  it('replaces the selection and GET returns it with categories', async () => {
    const { app, token } = await registerVerifyAndLogin('select@example.com');
    const headers = { authorization: `Bearer ${token}` };

    const empty = await app.inject({ method: 'GET', url: '/api/users/me/tasks', headers });
    expect(empty.statusCode).toBe(200);
    expect(empty.json()).toEqual({ tasks: [] });

    const [taskA, taskB] = await prisma.task.findMany({ take: 2, orderBy: { name: 'asc' } });
    const put = await app.inject({
      method: 'PUT',
      url: '/api/users/me/tasks',
      headers,
      payload: { taskIds: [taskA!.id, taskB!.id] },
    });
    expect(put.statusCode).toBe(200);
    expect(put.json().tasks).toHaveLength(2);
    expect(put.json().tasks[0]).toEqual({
      id: expect.any(String),
      name: expect.any(String),
      description: expect.any(String),
      category: { id: expect.any(String), name: expect.any(String) },
    });

    const fetched = await app.inject({ method: 'GET', url: '/api/users/me/tasks', headers });
    expect(fetched.json().tasks.map((t: { id: string }) => t.id).sort()).toEqual([taskA!.id, taskB!.id].sort());

    // Replacing with a subset drops the rest.
    const replaced = await app.inject({
      method: 'PUT',
      url: '/api/users/me/tasks',
      headers,
      payload: { taskIds: [taskB!.id] },
    });
    expect(replaced.json().tasks.map((t: { id: string }) => t.id)).toEqual([taskB!.id]);

    // Empty array clears the selection.
    const cleared = await app.inject({ method: 'PUT', url: '/api/users/me/tasks', headers, payload: { taskIds: [] } });
    expect(cleared.statusCode).toBe(200);
    expect(cleared.json()).toEqual({ tasks: [] });
  });

  it('rejects unknown task ids with 400 VALIDATION_ERROR', async () => {
    const { app, token } = await registerVerifyAndLogin('bogus@example.com');
    const res = await app.inject({
      method: 'PUT',
      url: '/api/users/me/tasks',
      headers: { authorization: `Bearer ${token}` },
      payload: { taskIds: ['does-not-exist'] },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a malformed body', async () => {
    const { app, token } = await registerVerifyAndLogin('malformed@example.com');
    const res = await app.inject({
      method: 'PUT',
      url: '/api/users/me/tasks',
      headers: { authorization: `Bearer ${token}` },
      payload: { taskIds: 'not-an-array' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('VALIDATION_ERROR');
  });
});
