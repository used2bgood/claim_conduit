
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, ArrowLeft, Users, ShieldCheck, User as UserIcon } from 'lucide-react';
import { createPageUrl } from '@/utils/url_generator';

export default function UserManagement() {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    const loadUsers = useCallback(async () => {
        setIsLoading(true);
        try {
            const currentUser = await User.me();
            if (currentUser.role !== 'admin') {
                navigate(createPageUrl('Dashboard'));
                return;
            }
            
            try {
                const userList = await User.list();
                setUsers(userList.sort((a, b) => a.full_name.localeCompare(b.full_name)));
            } catch (userListError) {
                console.error('Failed to load user list:', userListError);
                // Show a more specific error message
                alert('Unable to load users. This may be a temporary issue. Please try again or contact support if the problem persists.');
                navigate(createPageUrl('Dashboard'));
            }
        } catch (error) {
            console.error('Error in user management:', error);
            navigate(createPageUrl('Dashboard'));
        }
        setIsLoading(false);
    }, [navigate]);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    const handleManagerToggle = async (user, isManager) => {
        try {
            await User.update(user.id, { is_manager: isManager });
            setUsers(prevUsers =>
                prevUsers.map(u => (u.id === user.id ? { ...u, is_manager: isManager } : u))
            );
        } catch (error) {
            console.error('Error updating user role:', error);
            alert('Failed to update user role. Please try again.');
        }
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
                        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
                        <p className="text-gray-600 mt-1">Assign manager privileges to users.</p>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-600" />
                            All Users ({users.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="border rounded-lg">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>User</TableHead>
                                        <TableHead>System Role</TableHead>
                                        <TableHead className="text-right">Manager Privileges</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.map(user => (
                                        <TableRow key={user.id}>
                                            <TableCell>
                                                <div className="font-medium">{user.full_name}</div>
                                                <div className="text-sm text-gray-500">{user.email}</div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={user.role === 'admin' ? 'destructive' : 'secondary'}>
                                                    {user.role === 'admin' ? 
                                                        <ShieldCheck className="w-3.5 h-3.5 mr-1.5" /> : 
                                                        <UserIcon className="w-3.5 h-3.5 mr-1.5" />
                                                    }
                                                    {user.role}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Label htmlFor={`manager-switch-${user.id}`}>
                                                        {user.is_manager ? 'Manager' : 'Standard User'}
                                                    </Label>
                                                    <Switch
                                                        id={`manager-switch-${user.id}`}
                                                        checked={user.is_manager || false}
                                                        onCheckedChange={(checked) => handleManagerToggle(user, checked)}
                                                        disabled={user.role === 'admin'}
                                                        aria-label={`Toggle manager status for ${user.full_name}`}
                                                    />
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                         {users.some(u => u.role === 'admin') && (
                            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded-md">
                                Note: System 'admin' roles always have full privileges and cannot be demoted.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
