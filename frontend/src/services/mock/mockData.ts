import { Field, CreateFieldDto, UpdateFieldDto } from '../fieldService';
import { Task, CreateTaskDto, Evidence } from '../taskService';
import { User } from '../userService';
import { Lifecycle } from '../lifecycleService';
import {
  buildDemoTasks,
  generateDemoDataset,
} from '../demo/demoSeedGenerator';

// Helper function to add delay to simulate API calls
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const dataset = generateDemoDataset();

export const mockUsers: User[] = dataset.users;
export const mockFields: Field[] = dataset.fields;
export const mockTasks: Task[] = buildDemoTasks();
export const mockLifecycles: Lifecycle[] = dataset.lifecycles;

export const simulateDelay = () => delay(100 + Math.random() * 400);

export { generateDemoDataset, buildDemoTasks } from '../demo/demoSeedGenerator';
