
import React, { useState, useEffect } from "react";
import { Task } from "@/api/entities";
import { Note } from "@/api/entities"; // Added Note import
import { StatusOption } from "@/api/entities";
import { InspectionRequest } from "@/api/entities";
import { User } from "@/api/entities";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button"; // Added Button import
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"; // Added Dialog imports
import { Trash2, AlertTriangle, Loader2 } from "lucide-react"; // Added Lucide-react icons

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [inspectionRequests, setInspectionRequests] = useState([]);
  const [statusOptions, setStatusOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false); // New state for delete dialog visibility
  const [taskToDelete, setTaskToDelete] = useState(null); // New state to store task being deleted
  const [isDeleting, setIsDeleting] = useState(false); // New state for delete operation loading

  // Memoized map for quick color lookup
  const statusColorMap = React.useMemo(() => {
    return statusOptions.reduce((acc, option) => {
      acc[option.label] = `${option.color_bg} ${option.color_text}`;
      return acc;
    }, {});
  }, [statusOptions]);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    setIsLoading(true);
    try {
      const [taskData, requestData, user, taskStatuses] = await Promise.all([
        Task.list("-created_date"),
        InspectionRequest.list("-created_date"),
        User.me(),
        StatusOption.filter({ type: 'task' })
      ]);
      
      setCurrentUser(user);
      setInspectionRequests(requestData);
      setStatusOptions(taskStatuses);
      
      let relevantTasks = taskData;
      if (user.role !== 'admin' && !user.is_manager) {
        relevantTasks = taskData.filter(task => 
          task.created_by === user.email || task.assigned_to === user.email
        );
      }
      
      // Filter out completed tasks for the "Open Tasks" view
      const openTasks = relevantTasks.filter(task => task.status !== 'Completed');
      setTasks(openTasks);
    } catch (error) {
      console.error("Error loading tasks:", error);
    }
    setIsLoading(false);
  };

  // Function to open the delete confirmation dialog
  const handleDeleteRequest = (task) => {
    setTaskToDelete(task);
    setShowDeleteDialog(true);
  };

  // Function to handle the actual deletion
  const handleConfirmDelete = async () => {
    if (!taskToDelete) return;

    setIsDeleting(true);
    try {
      // First, delete all notes associated with the task
      const notesToDelete = await Note.filter({ task_id: taskToDelete.id });
      await Promise.all(notesToDelete.map(note => Note.delete(note.id)));

      // Then, delete the task itself
      await Task.delete(taskToDelete.id);

      setShowDeleteDialog(false);
      setTaskToDelete(null);
      await loadTasks(); // Refresh the list after successful deletion
    } catch (error) {
      console.error("Error deleting task:", error);
      alert("An error occurred while deleting the task."); // User-friendly error message
    }
    setIsDeleting(false);
  };

  const getClientNameForTask = (task) => {
    if (!task.related_request_id) return null;
    const relatedRequest = inspectionRequests.find(req => req.id === task.related_request_id);
    return relatedRequest ? relatedRequest.client_name : null;
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Open Tasks</h1>
            <p className="text-gray-600 mt-1">Create and track open tasks for your team</p>
          </div>
          <Link to={createPageUrl("CreateTask")}>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
              Create Task
            </button>
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Current Tasks ({tasks.length})</h2>
          
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading tasks...</p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 mb-2">No open tasks found</h3>
              <p className="text-gray-500 mb-4">Create a new task or check the Client Profile for completed ones</p>
              <Link to={createPageUrl("CreateTask")}>
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
                  Create Task
                </button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {tasks.map((task) => {
                const clientName = getClientNameForTask(task);
                return (
                  <div key={task.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <Link to={createPageUrl(`TaskDetails?id=${task.id}`)}>
                          <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-700">{task.title}</h3>
                        </Link>
                        {clientName && (
                          <Link to={createPageUrl(`ClientProfile?client=${encodeURIComponent(clientName)}`)}>
                            <p className="text-sm text-blue-600 hover:underline mt-1">Client: {clientName}</p>
                          </Link>
                        )}
                        {task.description && (
                          <p className="text-gray-600 text-sm mt-2 line-clamp-2">{task.description}</p>
                        )}
                        <div className="flex gap-4 text-sm text-gray-500 mt-2">
                          {task.assigned_to && <span>Assigned to: {task.assigned_to}</span>}
                          <span>Created by: {task.created_by}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4"> {/* Changed to items-center for alignment */}
                        <span className={`px-2 py-1 rounded text-xs ${statusColorMap[task.status] || 'bg-gray-100 text-gray-800'}`}>
                          {task.status || 'Unknown'}
                        </span>
                        {currentUser?.role === 'admin' && ( // Show delete button only for admins
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDeleteRequest(task)}
                            className="text-red-500 hover:text-red-700" // Added direct text color for button
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                    Confirm Task Deletion
                </DialogTitle>
            </DialogHeader>
            <DialogDescription className="py-4 space-y-3">
                 <p>
                    Are you sure you want to delete the task: <strong>{taskToDelete?.title}</strong>?
                </p>
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded-md p-3">
                   This will also permanently delete all notes associated with this task. This action cannot be undone.
                </div>
            </DialogDescription>
            <DialogFooter>
                <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={isDeleting}>
                    Cancel
                </Button>
                <Button variant="destructive" onClick={handleConfirmDelete} disabled={isDeleting}>
                    {isDeleting ? (
                        <>
                            <Loader2 className="animate-spin h-4 w-4 mr-2" />
                            Deleting...
                        </>
                    ) : (
                        <>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Yes, Delete Task
                        </>
                    )}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
