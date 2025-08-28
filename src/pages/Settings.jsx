import React from 'react';
import StatusManager from '../components/StatusManager';
import TaskStatusManager from '../components/tasks/TaskStatusManager';

export default function Settings() {
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Manage application labels and configurations.</p>
        </div>

        <div className="space-y-8">
          <StatusManager />
          <TaskStatusManager />
        </div>
      </div>
    </div>
  );
}