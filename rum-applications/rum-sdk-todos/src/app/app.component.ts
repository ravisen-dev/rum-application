import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RumApiService } from './rum-api.service';
import { RumSDK } from '@rum-app/sdk';

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
  }

  private initializeRumSdk() {
    if (!this.appId) {
      return;
    }

    RumSDK.init({
      endpoint: 'http://localhost:5000/api/telemetry/ingest',
      applicationId: this.appId,
      debug: true
    });

    this.status = `RUM SDK initialized for ${this.appId}`;
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
        this.initializeRumSdk();
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

      this.initializeRumSdk();
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

    RumSDK.getInstance().logEvent('todo-add', { title });
  }

  async toggleComplete(todo: TodoItem) {
    todo.completed = !todo.completed;
    this.status = todo.completed ? `Completed: ${todo.title}` : `Reopened: ${todo.title}`;

    RumSDK.getInstance().logEvent(todo.completed ? 'todo-complete' : 'todo-reopen', {
      title: todo.title,
      completed: todo.completed
    });
  }

  async removeTodo(todo: TodoItem) {
    this.todos = this.todos.filter((item) => item.id !== todo.id);
    this.status = `Removed: ${todo.title}`;

    RumSDK.getInstance().logEvent('todo-delete', { title: todo.title });
  }

}
