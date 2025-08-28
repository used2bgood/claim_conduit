
import React, { useState, useEffect, useCallback } from 'react';
import { Task } from '@/api/entities';
import { Note } from '@/api/entities';
import { StatusOption } from '@/api/entities';
import { InspectionRequest } from '@/api/entities';
import { User } from '@/api/entities';
import { useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ArrowLeft, MessageSquare, Send, Calendar, User as UserIcon, Building2, AlertCircle, Loader2, Trash2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

export default function TaskDetails() {
    const navigate = useNavigate();
    const [task, setTask] = useState(null);
    const [notes, setNotes] = useState([]);
    const [statusOptions, setStatusOptions] = useState([]);
    const [clientName, setClientName] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [newNote, setNewNote] = useState("");
    const [isSubmittingNote, setIsSubmittingNote] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const getTaskId = () => {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id');
    };

    const loadData = useCallback(async () => {
        const taskId = getTaskId();
        if (!taskId) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const [taskData, taskNotes, statuses, user] = await Promise.all([
                Task.get(taskId),
                Note.filter({ task_id: taskId }, "-created_date"),
                StatusOption.filter({ type: 'task' }),
                User.me()
            ]);

            setTask(taskData);
            setNotes(taskNotes);
            setStatusOptions(statuses);
            setCurrentUser(user);

            if (taskData.related_request_id) {
                const request = await InspectionRequest.get(taskData.related_request_id);
                setClientName(request.client_name);
            }
        } catch (error) {
            console.error("Error loading task data:", error);
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleStatusChange = async (newStatus) => {
        if (!task) return;
        try {
            const updatedTask = await Task.update(task.id, { status: newStatus });
            setTask(updatedTask);
        } catch (error) {
            console.error("Error updating status:", error);
        }
    };

    const handleAddNote = async (e) => {
        e.preventDefault();
        if (!newNote.trim() || !task) return;

        setIsSubmittingNote(true);
        try {
            await Note.create({
                task_id: task.id,
                content: newNote
            });
            setNewNote("");
            // Refresh notes list
            const taskNotes = await Note.filter({ task_id: task.id }, "-created_date");
            setNotes(taskNotes);
        } catch (error) {
            console.error("Error adding note:", error);
        }
        setIsSubmittingNote(false);
    };

    const handleConfirmDelete = async () => {
        if (!task) return;
        setIsDeleting(true);
        try {
            // First, delete all notes associated with the task
            const notesToDelete = await Note.filter({ task_id: task.id });
            await Promise.all(notesToDelete.map(note => Note.delete(note.id)));
    
            // Then, delete the task itself
            await Task.delete(task.id);
            
            setShowDeleteDialog(false);
            navigate(createPageUrl("Tasks"));
        } catch (error) {
            console.error("Error deleting task:", error);
            alert("An error occurred while deleting the task.");
        }
        setIsDeleting(false);
    };

    if (isLoading) {
        return (
            <div className="p-6 flex justify-center items-center h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!task) {
        return (
            <div className="p-6 text-center">
                <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
                <h1 className="text-2xl font-bold">Task Not Found</h1>
                <p className="text-gray-600">The requested task could not be found.</p>
                <Button onClick={() => navigate(createPageUrl("Tasks"))} className="mt-4">Back to Tasks</Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => navigate(-1)}
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                        <div className="flex-grow">
                            <h1 className="text-3xl font-bold text-gray-900 line-clamp-1" title={task.title}>{task.title}</h1>
                            {clientName && (
                                <Link to={createPageUrl(`ClientProfile?client=${encodeURIComponent(clientName)}`)}>
                                    <p className="text-blue-600 hover:underline mt-1">Client: {clientName}</p>
                                </Link>
                            )}
                        </div>
                    </div>
                    {currentUser?.role === 'admin' && (
                        <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Task
                        </Button>
                    )}
                </div>

                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Details Column */}
                    <div className="lg:col-span-1 space-y-6">
                        <Card className="bg-white shadow-sm border-0">
                            <CardHeader>
                                <CardTitle>Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 text-sm">
                                <div className="flex items-center gap-2">
                                    <UserIcon className="w-4 h-4 text-gray-500" />
                                    <span className="font-semibold text-gray-700">Assigned To:</span>
                                    <span>{task.assigned_to || "Unassigned"}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-gray-500" />
                                    <span className="font-semibold text-gray-700">Created:</span>
                                    <span>{format(new Date(task.created_date), 'MMM d, yyyy')}</span>
                                </div>
                                {task.due_date && (
                                     <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-red-500" />
                                        <span className="font-semibold text-gray-700">Due Date:</span>
                                        <span>{format(new Date(task.due_date), 'MMM d, yyyy')}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-gray-500" />
                                    <span className="font-semibold text-gray-700">Request Type:</span>
                                    <Badge variant="secondary">{task.request_type}</Badge>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-white shadow-sm border-0">
                            <CardHeader>
                                <CardTitle>Change Status</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Select value={task.status} onValueChange={handleStatusChange}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {statusOptions.map(option => (
                                            <SelectItem key={option.id} value={option.label}>
                                               <Badge className={`${option.color_bg} ${option.color_text}`}>{option.label}</Badge>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Notes Column */}
                    <div className="lg:col-span-2">
                        <Card className="bg-white shadow-sm border-0">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <MessageSquare className="w-5 h-5 text-blue-600" />
                                    Notes
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleAddNote} className="mb-6 space-y-3">
                                    <Textarea
                                        value={newNote}
                                        onChange={(e) => setNewNote(e.target.value)}
                                        placeholder="Add a new note..."
                                        rows={3}
                                    />
                                    <div className="flex justify-end">
                                        <Button type="submit" disabled={!newNote.trim() || isSubmittingNote}>
                                            {isSubmittingNote ? (
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            ) : (
                                                <Send className="w-4 h-4 mr-2" />
                                            )}
                                            Add Note
                                        </Button>
                                    </div>
                                </form>
                                
                                <div className="space-y-4">
                                    {notes.length === 0 ? (
                                        <p className="text-center text-gray-500 py-4">No notes have been added yet.</p>
                                    ) : (
                                        notes.map(note => (
                                            <div key={note.id} className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                                <p className="text-gray-800 whitespace-pre-wrap">{note.content}</p>
                                                <div className="text-xs text-gray-500 mt-2 flex items-center justify-between">
                                                    <span>by {note.created_by}</span>
                                                    <span>{format(new Date(note.created_date), 'MMM d, yyyy p')}</span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
            
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
                          Are you sure you want to delete this task?
                      </p>
                      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded-md p-3">
                         This will also permanently delete all associated notes. This action cannot be undone.
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
                                  Yes, Delete
                              </>
                          )}
                      </Button>
                  </DialogFooter>
              </DialogContent>
            </Dialog>
        </div>
    );
}
