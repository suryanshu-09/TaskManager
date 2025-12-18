const API_BASE_URL = process.env.API_BASE_URL!;

export interface ApiTask {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  status: 'pending' | 'completed';
  lastUpdatedAt: number;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  status: 'pending' | 'completed';
  lastUpdatedAt: number;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  status?: 'pending' | 'completed';
  lastUpdatedAt?: number;
}

interface ApiResponse<T> {
  data: T;
}

interface ApiErrorResponse {
  error: string;
  serverTask?: ApiTask;
}

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public response?: ApiErrorResponse
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Unauthorized - Please sign in') {
    super(401, message);
    this.name = 'UnauthorizedError';
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = 'Resource not found') {
    super(404, message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends ApiError {
  serverTask: ApiTask;

  constructor(message: string = 'Stale update conflict', serverTask: ApiTask) {
    super(409, message, { error: 'STALE_UPDATE', serverTask });
    this.name = 'ConflictError';
    this.serverTask = serverTask;
  }
}

export class ServerError extends ApiError {
  constructor(statusCode: number, message: string = 'Server error') {
    super(statusCode, message);
    this.name = 'ServerError';
  }
}

export class NetworkError extends Error {
  constructor(message: string = 'Network error - Please check your connection') {
    super(message);
    this.name = 'NetworkError';
  }
}

type TokenGetter = () => Promise<string | null>;
let getAuthToken: TokenGetter | null = null;

export function setAuthTokenGetter(getter: TokenGetter): void {
  getAuthToken = getter;
}

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  if (!getAuthToken) {
    console.error('Auth token getter not configured');
    throw new UnauthorizedError('Auth token getter not configured');
  }

  const token = await getAuthToken();
  console.log('Token available:', !!token, 'Token length:', token?.length || 0);

  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      console.log('Token payload:', {
        exp: payload.exp,
        iat: payload.iat,
        sub: payload.sub,
        expDate: new Date(payload.exp * 1000).toISOString(),
        now: new Date().toISOString(),
        isExpired: Date.now() > payload.exp * 1000,
      });
    } catch (e) {
      console.log('Could not decode token:', e instanceof Error ? e.message : e);
    }
  }

  if (!token) {
    console.error('No authentication token available');
    throw new UnauthorizedError('No authentication token available');
  }

  const url = `${API_BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...(options.headers as Record<string, string>),
  };

  console.log('Request headers:', {
    'Content-Type': headers['Content-Type'],
    Authorization: headers.Authorization ? 'Bearer [TOKEN]' : 'No Auth',
  });

  try {
    console.log(`Making ${options.method || 'GET'} request to: ${url}`);
    const response = await fetch(url, {
      ...options,
      headers,
    });

    console.log(`Response status: ${response.status} for ${url}`);

    if (response.status === 204) {
      return undefined as T;
    }

    if (response.status === 401) {
      let errorDetails = '';
      try {
        const errorText = await response.text();
        errorDetails = errorText;
        console.log('401 Error response body:', errorText);
      } catch (e) {
        console.log('Could not read 401 error response body');
      }
      throw new UnauthorizedError(`Unauthorized - ${errorDetails}`);
    }

    if (response.status === 404) {
      throw new NotFoundError();
    }

    if (response.status === 409) {
      const errorData = (await response.json()) as ApiErrorResponse;
      if (errorData.serverTask) {
        throw new ConflictError(errorData.error, errorData.serverTask);
      }
      throw new ApiError(409, errorData.error || 'Conflict');
    }

    if (response.status >= 400 && response.status < 500) {
      let errorMessage = `Request failed with status ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {}
      throw new ApiError(response.status, errorMessage);
    }

    if (response.status >= 500) {
      let errorMessage = `Server error (${response.status})`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {}
      throw new ServerError(response.status, errorMessage);
    }

    const data = await response.json();
    return data as T;
  } catch (error) {
    if (error instanceof ApiError || error instanceof NetworkError) {
      throw error;
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new NetworkError();
    }

    if (error instanceof Error) {
      throw new NetworkError(error.message);
    }

    throw new NetworkError('Unknown error occurred');
  }
}

export async function fetchTasks(): Promise<ApiTask[]> {
  const response = await apiRequest<ApiResponse<ApiTask[]>>('/tasks');
  return response.data;
}

export async function createTask(payload: CreateTaskPayload): Promise<ApiTask> {
  const response = await apiRequest<ApiResponse<ApiTask>>('/tasks', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function updateTask(id: string, payload: UpdateTaskPayload): Promise<ApiTask> {
  const response = await apiRequest<ApiResponse<ApiTask>>(`/tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return response.data;
}

export async function deleteTask(id: string): Promise<void> {
  await apiRequest<void>(`/tasks/${id}`, {
    method: 'DELETE',
  });
}

export async function healthCheck(): Promise<{ status: string }> {
  const url = `${API_BASE_URL}/`;
  try {
    console.log('Health check to:', url);
    const response = await fetch(url);
    console.log('Health check response status:', response.status);
    if (!response.ok) {
      const text = await response.text();
      console.log('Health check error body:', text);
      throw new ServerError(response.status, 'Health check failed');
    }
    return await response.json();
  } catch (error) {
    if (error instanceof ServerError) {
      throw error;
    }
    throw new NetworkError('Cannot reach server');
  }
}
