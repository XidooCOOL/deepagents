/**
 * task_queue.js - 任务队列模块
 * Phase 4: 批量执行 + 定时任务
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { DATA_ROOT } = require('./config');

const QUEUE_FILE = path.join(DATA_ROOT, 'task_queue.json');

const TaskStatus = { PENDING: 'pending', RUNNING: 'running', COMPLETED: 'completed', FAILED: 'failed' };

class Task {
  constructor(shop, options = {}) {
    this.id = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    this.shop = shop;
    this.options = options;
    this.status = TaskStatus.PENDING;
    this.result = null;
    this.error = null;
    this.startTime = null;
    this.endTime = null;
    this.createdAt = new Date().toISOString();
  }
  get duration() { return this.startTime && this.endTime ? new Date(this.endTime) - new Date(this.startTime) : null; }
  toJSON() { return { id: this.id, shop: this.shop, options: this.options, status: this.status, result: this.result, error: this.error, startTime: this.startTime, endTime: this.endTime, duration: this.duration, createdAt: this.createdAt }; }
}

class TaskQueue {
  constructor(options = {}) {
    this.options = { parallel: false, maxParallel: 3, stopOnError: false, ...options };
    this.tasks = [];
    this.running = false;
  }

  add(shop, options = {}) { const t = new Task(shop, options); this.tasks.push(t); return t; }
  addBatch(shops, options = {}) { return shops.map(s => this.add(s, options)); }

  async run() {
    if (this.running) throw new Error('队列正在运行');
    this.running = true;
    console.log(`🚀 执行队列，共 ${this.tasks.length} 个任务 (${this.options.parallel ? '并行' : '串行'})`);
    this.options.parallel ? await this._runParallel() : await this._runSerial();
    this.running = false;
    const s = this.getStats();
    console.log(`\n✅ 完成: 成功${s.completed} | 失败${s.failed}`);
    return s;
  }

  async _runSerial() { for (const t of this.tasks) await this._executeTask(t); }
  async _runParallel() { const p = this.tasks.map(t => this._executeTask(t)); await Promise.all(p); }

  async _executeTask(task) {
    task.status = TaskStatus.RUNNING;
    task.startTime = new Date().toISOString();
    console.log(`▶️ [${task.shop}] 开始...`);
    try {
      const args = [task.shop];
      if (task.options.sales) args.push('--sales');
      if (task.options.service) args.push('--service');
      if (task.options.ads) args.push('--ads');
      if (task.options.all) args.push('--all');
      if (task.options.date) args.push(task.options.date);
      await this._exec(args);
      task.status = TaskStatus.COMPLETED;
      console.log(`✅ [${task.shop}] 完成`);
    } catch (e) {
      task.status = TaskStatus.FAILED; task.error = e.message;
      console.log(`❌ [${task.shop}] ${e.message}`);
      if (this.options.stopOnError) throw e;
    }
    task.endTime = new Date().toISOString();
  }

  _exec(args) {
    return new Promise((resolve, reject) => {
      const child = spawn('node', [path.join(__dirname, '..', 'scripts', 'pdd-open.js'), ...args], { stdio: 'inherit', shell: true });
      child.on('close', c => c === 0 ? resolve({ c }) : reject(new Error(`退出码${c}`)));
      child.on('error', reject);
    });
  }

  getStats() {
    const c = this.tasks.filter(t => t.status === TaskStatus.COMPLETED).length;
    const f = this.tasks.filter(t => t.status === TaskStatus.FAILED).length;
    return { total: this.tasks.length, completed: c, failed: f, rate: this.tasks.length ? Math.round(c/this.tasks.length*100) : 0 };
  }
}

module.exports = { TaskQueue, TaskStatus };
