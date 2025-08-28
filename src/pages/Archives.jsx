
import React, { useState, useEffect, useCallback } from 'react';
import { ArchivedProfile } from '@/api/entities';
import { InspectionRequest } from '@/api/entities';
import { ClientDocument } from '@/api/entities';
import { Task } from '@/api/entities';
import { Note } from '@/api/entities';
import { User } from '@/api/entities';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
    Archive, 
    RotateCcw, 
    Trash2, 
    Calendar, 
    User as UserIcon,
    AlertTriangle,
    Loader2,
    ArrowLeft
} from 'lucide-react';
import { format } from 'date-fns';

export default function Archives() {
    const navigate = useNavigate();
    const [archivedProfiles, setArchivedProfiles] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showRestoreDialog, setShowRestoreDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [selectedProfile, setSelectedProfile] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    const loadCurrentUser = useCallback(async () => {
        try {
            const user = await User.me();
            setCurrentUser(user);
            if (user.role !== 'admin') {
                navigate(createPageUrl('Dashboard'));
            }
        } catch (error) {
            console.error('Error loading user:', error);
        }
    }, [navigate]);

    const loadArchivedProfiles = useCallback(async () => {
        setIsLoading(true);
        try {
            const archives = await ArchivedProfile.list('-created_date');
            setArchivedProfiles(archives);
        } catch (error) {
            console.error('Error loading archived profiles:', error);
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        loadArchivedProfiles();
        loadCurrentUser();
    }, [loadArchivedProfiles, loadCurrentUser]);

    const handleRestore = async () => {
        if (!selectedProfile) return;

        setIsProcessing(true);
        try {
            const { archived_data } = selectedProfile;

            // Restore inspection requests
            for (const request of archived_data.requests) {
                const { id, ...requestData } = request;
                const restoredRequest = await InspectionRequest.create(requestData);
                
                // Restore documents for this request
                const relatedDocs = archived_data.documents.filter(doc => doc.inspection_request_id === id);
                for (const doc of relatedDocs) {
                    const { id: docId, inspection_request_id, ...docData } = doc;
                    await ClientDocument.create({
                        ...docData,
                        inspection_request_id: restoredRequest.id
                    });
                }

                // Restore tasks for this request
                const relatedTasks = archived_data.tasks.filter(task => task.related_request_id === id);
                for (const task of relatedTasks) {
                    const { id: taskId, related_request_id, ...taskData } = task;
                    const restoredTask = await Task.create({
                        ...taskData,
                        related_request_id: restoredRequest.id
                    });

                    // Restore notes for this task
                    const taskNotes = archived_data.notes.filter(note => note.task_id === taskId);
                    for (const note of taskNotes) {
                        const { id: noteId, task_id, ...noteData } = note;
                        await Note.create({
                            ...noteData,
                            task_id: restoredTask.id
                        });
                    }
                }
            }

            // Delete the archive entry
            await ArchivedProfile.delete(selectedProfile.id);

            setShowRestoreDialog(false);
            setSelectedProfile(null);
            loadArchivedProfiles();
            
            alert(`Profile for ${selectedProfile.client_name} has been successfully restored!`);
        } catch (error) {
            console.error('Error restoring profile:', error);
            alert('Error restoring profile. Please try again.');
        }
        setIsProcessing(false);
    };

    const handlePermanentDelete = async () => {
        if (!selectedProfile) return;

        setIsProcessing(true);
        try {
            await ArchivedProfile.delete(selectedProfile.id);
            setShowDeleteDialog(false);
            setSelectedProfile(null);
            loadArchivedProfiles();
            
            alert(`Profile for ${selectedProfile.client_name} has been permanently deleted.`);
        } catch (error) {
            console.error('Error permanently deleting profile:', error);
        }
        setIsProcessing(false);
    };

    if (currentUser?.role !== 'admin') {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => navigate(createPageUrl("Dashboard"))}
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Archived Profiles</h1>
                        <p className="text-gray-600 mt-1">Manage deleted client profiles and restore if needed</p>
                    </div>
                </div>

                {isLoading ? (
                    <div className="text-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                        <p className="text-gray-500">Loading archived profiles...</p>
                    </div>
                ) : archivedProfiles.length === 0 ? (
                    <Card className="bg-white shadow-sm border-0">
                        <CardContent className="text-center py-12">
                            <Archive className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No archived profiles</h3>
                            <p className="text-gray-500">Deleted client profiles will appear here for restoration</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {archivedProfiles.map((profile) => (
                            <Card key={profile.id} className="bg-white shadow-sm border-0">
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-3">
                                                <Archive className="w-6 h-6 text-gray-500" />
                                                <h3 className="text-xl font-semibold text-gray-900">
                                                    {profile.client_name}
                                                </h3>
                                                <Badge variant="secondary">Archived</Badge>
                                            </div>

                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-4 h-4 text-gray-400" />
                                                    <div>
                                                        <p className="font-medium text-gray-700">Deleted</p>
                                                        <p className="text-gray-600">
                                                            {format(new Date(profile.created_date), 'MMM d, yyyy')}
                                                        </p>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center gap-2">
                                                    <UserIcon className="w-4 h-4 text-gray-400" />
                                                    <div>
                                                        <p className="font-medium text-gray-700">Deleted By</p>
                                                        <p className="text-gray-600">{profile.deleted_by}</p>
                                                    </div>
                                                </div>

                                                <div>
                                                    <p className="font-medium text-gray-700">Requests</p>
                                                    <p className="text-gray-600">
                                                        {profile.archived_data?.requests?.length || 0}
                                                    </p>
                                                </div>

                                                <div>
                                                    <p className="font-medium text-gray-700">Documents</p>
                                                    <p className="text-gray-600">
                                                        {profile.archived_data?.documents?.length || 0}
                                                    </p>
                                                </div>
                                            </div>

                                            {profile.deletion_reason && (
                                                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                                    <p className="text-sm font-medium text-gray-700">Deletion Reason:</p>
                                                    <p className="text-sm text-gray-600">{profile.deletion_reason}</p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-col gap-2 ml-4">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setSelectedProfile(profile);
                                                    setShowRestoreDialog(true);
                                                }}
                                            >
                                                <RotateCcw className="w-4 h-4 mr-2" />
                                                Restore
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => {
                                                    setSelectedProfile(profile);
                                                    setShowDeleteDialog(true);
                                                }}
                                            >
                                                <Trash2 className="w-4 h-4 mr-2" />
                                                Delete Forever
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Restore Confirmation Dialog */}
                <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <RotateCcw className="w-6 h-6 text-green-600" />
                                Restore Profile
                            </DialogTitle>
                        </DialogHeader>
                        <div className="py-4">
                            <p className="text-gray-700">
                                Are you sure you want to restore the profile for <strong>{selectedProfile?.client_name}</strong>?
                            </p>
                            <p className="text-sm text-gray-500 mt-2">
                                This will recreate all inspection requests, documents, tasks, and notes associated with this client.
                            </p>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowRestoreDialog(false)} disabled={isProcessing}>
                                Cancel
                            </Button>
                            <Button onClick={handleRestore} disabled={isProcessing} className="bg-green-600 hover:bg-green-700">
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="animate-spin h-4 w-4 mr-2" />
                                        Restoring...
                                    </>
                                ) : (
                                    <>
                                        <RotateCcw className="w-4 h-4 mr-2" />
                                        Restore Profile
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Permanent Delete Confirmation Dialog */}
                <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <AlertTriangle className="w-6 h-6 text-red-600" />
                                Permanent Deletion
                            </DialogTitle>
                        </DialogHeader>
                        <div className="py-4">
                            <p className="text-gray-700 mb-3">
                                Are you absolutely sure you want to <strong>permanently delete</strong> the archived profile for <strong>{selectedProfile?.client_name}</strong>?
                            </p>
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                <p className="text-red-800 text-sm font-medium">⚠️ This action cannot be undone!</p>
                                <p className="text-red-700 text-sm">All data will be permanently lost.</p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={isProcessing}>
                                Cancel
                            </Button>
                            <Button variant="destructive" onClick={handlePermanentDelete} disabled={isProcessing}>
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="animate-spin h-4 w-4 mr-2" />
                                        Deleting...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Delete Forever
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
