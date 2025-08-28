import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '@/api/entities';
import { InspectionRequest } from '@/api/entities';
import { ClientDocument } from '@/api/entities';
import { Task } from '@/api/entities';
import { Note } from '@/api/entities';
import { ArchivedProfile } from '@/api/entities';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, AlertTriangle, Loader2, ArrowLeft, Wrench } from 'lucide-react';

export default function AdminDirectory() {
    const [clients, setClients] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedClients, setSelectedClients] = useState(new Set());
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const navigate = useNavigate();

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const user = await User.me();
            setCurrentUser(user);
            if (user.role !== 'admin') {
                navigate(createPageUrl('Dashboard'));
                return;
            }

            const requests = await InspectionRequest.list('-created_date');
            
            const clientMap = {};
            requests.forEach(request => {
                const key = request.client_name;
                if (key && !clientMap[key]) {
                    clientMap[key] = {
                        name: request.client_name,
                        address: request.property_address
                    };
                }
            });

            const clientsArray = Object.values(clientMap).sort((a, b) => a.name.localeCompare(b.name));
            setClients(clientsArray);

        } catch (error) {
            console.error('Error loading data:', error);
            if (error.message.includes('401')) {
                navigate(createPageUrl('Dashboard'));
            }
        }
        setIsLoading(false);
    }, [navigate]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleSelectAll = (checked) => {
        if (checked) {
            setSelectedClients(new Set(clients.map(c => c.name)));
        } else {
            setSelectedClients(new Set());
        }
    };

    const handleSelectClient = (clientName, checked) => {
        const newSelection = new Set(selectedClients);
        if (checked) {
            newSelection.add(clientName);
        } else {
            newSelection.delete(clientName);
        }
        setSelectedClients(newSelection);
    };

    const handleBulkDelete = async () => {
        setIsProcessing(true);
        try {
            const clientNamesToDelete = Array.from(selectedClients);
            
            for (const clientName of clientNamesToDelete) {
                const clientRequests = await InspectionRequest.filter({ client_name: clientName });
                if (clientRequests.length === 0) continue;

                const requestIds = clientRequests.map(r => r.id);
                
                const clientDocs = await ClientDocument.filter({ inspection_request_id: { $in: requestIds } });
                const clientTasks = await Task.filter({ related_request_id: { $in: requestIds } });

                const taskIds = clientTasks.map(t => t.id);
                const clientNotes = taskIds.length > 0 ? await Note.filter({ task_id: { $in: taskIds } }) : [];

                const archived_data = {
                    requests: clientRequests,
                    documents: clientDocs,
                    tasks: clientTasks,
                    notes: clientNotes,
                };
                
                await ArchivedProfile.create({
                    client_name: clientName,
                    archived_data,
                    deleted_by: currentUser.email,
                    original_created_date: clientRequests[clientRequests.length - 1].created_date,
                });

                // Now delete the original records
                await Promise.all([
                    ...clientNotes.map(n => Note.delete(n.id)),
                    ...clientTasks.map(t => Task.delete(t.id)),
                    ...clientDocs.map(d => ClientDocument.delete(d.id)),
                    ...clientRequests.map(r => InspectionRequest.delete(r.id)),
                ]);
            }
            
            setShowDeleteDialog(false);
            setSelectedClients(new Set());
            await loadData(); // Refresh the list
            alert(`${clientNamesToDelete.length} client profiles have been archived.`);
        } catch (error) {
            console.error("Error archiving profiles:", error);
            alert("An error occurred while archiving profiles. Please check the console and try again.");
        }
        setIsProcessing(false);
    };

    if (isLoading) {
        return (
            <div className="p-6 flex justify-center items-center h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }
    
    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                     <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Admin Tools: Client Directory</h1>
                        <p className="text-gray-600 mt-1">View all clients and perform bulk actions like archiving.</p>
                    </div>
                </div>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                           <Wrench className="w-5 h-5 text-blue-600" />
                           Client Profiles ({clients.length})
                        </CardTitle>
                        <Button 
                            variant="destructive" 
                            onClick={() => setShowDeleteDialog(true)}
                            disabled={selectedClients.size === 0}
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Archive Selected ({selectedClients.size})
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="border rounded-lg">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[50px]">
                                            <Checkbox
                                                checked={selectedClients.size > 0 && selectedClients.size === clients.length}
                                                onCheckedChange={handleSelectAll}
                                                aria-label="Select all rows"
                                            />
                                        </TableHead>
                                        <TableHead>Client Name</TableHead>
                                        <TableHead>Most Recent Address</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {clients.length > 0 ? clients.map((client) => (
                                        <TableRow key={client.name}>
                                            <TableCell>
                                                <Checkbox
                                                    checked={selectedClients.has(client.name)}
                                                    onCheckedChange={(checked) => handleSelectClient(client.name, checked)}
                                                    aria-label={`Select row for ${client.name}`}
                                                />
                                            </TableCell>
                                            <TableCell className="font-medium">{client.name}</TableCell>
                                            <TableCell>{client.address}</TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={3} className="h-24 text-center">
                                                No clients found.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-6 h-6 text-red-600" />
                            Confirm Archiving
                        </DialogTitle>
                    </DialogHeader>
                    <DialogDescription className="py-4 space-y-3">
                         <p>
                            You are about to archive <strong>{selectedClients.size}</strong> client profile(s).
                        </p>
                        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded-md p-3">
                           This action will move all associated Inspection Requests, Documents, Tasks, and Notes to the Archives. Profiles can be restored later from the Archives page.
                        </div>
                        <p>Are you sure you want to proceed?</p>
                    </DialogDescription>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={isProcessing}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleBulkDelete} disabled={isProcessing}>
                            {isProcessing ? (
                                <>
                                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                                    Archiving...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Yes, Archive
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}