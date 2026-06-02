import { Component, computed, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RumApiService } from './rum-api.service';

interface TodoItem {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [RumApiService],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'RUM SDK Todos';
  newTodo = '';
  todos: TodoItem[] = [];
  appId = '';
  apiKey = '';
  status = 'Starting the RUM SDK Todos app...';

  private rumApi = inject(RumApiService);

  async ngOnInit() {
    await this.initializeApplication();
    await this.sendPageView();
  }

  private async initializeApplication() {
    this.status = 'Checking for existing RUM application...';

    try {
      const apps = await this.rumApi.getApplications();
      const existing = apps.find((app) => app.name?.toLowerCase?.() === this.title.toLowerCase());

      const existingKey = existing?.apiKey ?? existing?.ApiKey;
      if (existing && existingKey) {
        this.appId = existingKey;
        this.apiKey = existingKey;
        this.status = `Using existing application: ${existing.name}`;
        return;
      }

      this.status = 'Creating a new monitored application...';
      const created = await this.rumApi.createApplication(this.title);
      const createdKey = created.apiKey ?? created.ApiKey;
      this.appId = createdKey;
      this.apiKey = createdKey;

      if (!this.appId) {
        throw new Error('Application was created but did not return an apiKey.');
      }

      this.status = `Created new application: ${created.name}`;
    } catch (error) {
      console.error('RUM SDK Todos initialization failed:', error);
      this.status = 'Failed to initialize RUM app. Check backend and browser console.';
    }
  }

  async addTodo() {
    const title = this.newTodo.trim();
    if (!title || !this.appId) {
      return;
    }

    const todo: TodoItem = {
      id: crypto.randomUUID(),
      title,
      completed: false,
      createdAt: new Date().toISOString()
    };

    this.todos = [todo, ...this.todos];
    this.newTodo = '';
    this.status = `Todo added: ${title}`;

    await this.rumApi.sendTelemetry(this.appId, {
      type: 'event',
      eventType: 'todo-add',
      elementId: 'todo-input',
      elementTag: 'input',
      elementPath: 'app-root > form > input',
      metadata: JSON.stringify({ title }),
      path: '/todos'
    });
  }

  async toggleComplete(todo: TodoItem) {
    todo.completed = !todo.completed;
    this.status = todo.completed ? `Completed: ${todo.title}` : `Reopened: ${todo.title}`;

    await this.rumApi.sendTelemetry(this.appId, {
      type: 'event',
      eventType: todo.completed ? 'todo-complete' : 'todo-reopen',
      elementId: `todo-${todo.id}`,
      elementTag: 'li',
      elementClass: todo.completed ? 'todo-completed' : 'todo-pending',
      elementPath: `app-root > ul > li:nth-child(${this.todos.indexOf(todo) + 1})`,
      metadata: JSON.stringify({ title: todo.title, completed: todo.completed }),
      path: '/todos'
    });
  }

  async removeTodo(todo: TodoItem) {
    this.todos = this.todos.filter((item) => item.id !== todo.id);
    this.status = `Removed: ${todo.title}`;

    await this.rumApi.sendTelemetry(this.appId, {
      type: 'event',
      eventType: 'todo-delete',
      elementId: `todo-${todo.id}`,
      elementTag: 'button',
      elementPath: 'app-root > ul > li > button',
      metadata: JSON.stringify({ title: todo.title }),
      path: '/todos'
    });
  }

  private async sendPageView() {
    if (!this.appId) {
      return;
    }

    await this.rumApi.sendTelemetry(this.appId, {
      type: 'pageview',
      path: '/todos',
      title: 'RUM SDK Todos'
    });
  }
}
